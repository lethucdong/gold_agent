import type { Context } from "hono";
import { z } from "zod";
import { goldAnalysisAgent } from "../agents/gold-analysis.agent.js";
import { newsResearchAgent } from "../agents/news-research.agent.js";
import { macroEconomicsAgent } from "../agents/macro-economics.agent.js";
import { portfolioAdvisorAgent } from "../agents/portfolio-advisor.agent.js";
import { riskManagementAgent } from "../agents/risk-management.agent.js";
import { responseAgent } from "../agents/response.agent.js";
import { userMemoryService } from "../memory/user-memory.service.js";

const RequestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export async function handleChatStream(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.errors }, 400);
  }

  const { userId, message, conversationId } = parsed.data;
  const convId = conversationId ?? `conv_${userId}_${Date.now()}`;

  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = (data: object) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Chạy pipeline bất đồng bộ, không block response
  (async () => {
    try {
      // --- Step 1: Intent ---
      send({ type: "progress", step: "intent", message: "Đang phân tích câu hỏi của bạn..." });

      let intent = {
        needNews: true, needMacro: false, needTechnical: true,
        needPortfolio: false, needRisk: false,
      };
      try {
        const intentResult = await goldAnalysisAgent.generateText(
          `Phân loại câu hỏi sau, trả về JSON với boolean fields: needNews, needMacro, needTechnical, needPortfolio, needRisk.\nCâu hỏi: "${message}"`,
          { userId, conversationId: convId },
        );
        const match = intentResult.text.match(/\{[\s\S]*?\}/);
        if (match) intent = { ...intent, ...JSON.parse(match[0]) };
      } catch { /* dùng defaults */ }

      // --- Step 2: User memory ---
      send({ type: "progress", step: "memory", message: "Đang tải hồ sơ đầu tư của bạn..." });
      const userProfile = await userMemoryService.getProfile(userId);

      const analysisResults: Record<string, string> = {};
      const agentsUsed: string[] = [];

      // --- Step 3: Technical analysis ---
      if (intent.needTechnical) {
        send({ type: "progress", step: "technical", message: "Đang phân tích kỹ thuật XAUUSD, SJC, PNJ..." });
        try {
          const r = await goldAnalysisAgent.generateText(
            `Phân tích kỹ thuật đầy đủ giá vàng XAUUSD, SJC, PNJ. Câu hỏi gốc: "${message}"`,
            { userId, conversationId: convId },
          );
          analysisResults.technicalAnalysis = r.text;
          agentsUsed.push("gold-analysis-agent");
        } catch { /* skip */ }
      }

      // --- Step 4: News ---
      if (intent.needNews) {
        send({ type: "progress", step: "news", message: "Đang nghiên cứu tin tức thị trường vàng..." });
        try {
          const r = await newsResearchAgent.generateText(
            `Nghiên cứu tin tức và tâm lý thị trường vàng. Câu hỏi: "${message}"`,
            { userId, conversationId: convId },
          );
          analysisResults.newsAnalysis = r.text;
          agentsUsed.push("news-research-agent");
        } catch { /* skip */ }
      }

      // --- Step 5: Macro ---
      if (intent.needMacro) {
        send({ type: "progress", step: "macro", message: "Đang phân tích FED, CPI, NFP..." });
        try {
          const r = await macroEconomicsAgent.generateText(
            `Phân tích kinh tế vĩ mô tác động đến vàng. Câu hỏi: "${message}"`,
            { userId, conversationId: convId },
          );
          analysisResults.macroAnalysis = r.text;
          agentsUsed.push("macro-economics-agent");
        } catch { /* skip */ }
      }

      // --- Step 6: Portfolio ---
      if (intent.needPortfolio) {
        send({ type: "progress", step: "portfolio", message: "Đang tư vấn phân bổ danh mục đầu tư..." });
        try {
          const r = await portfolioAdvisorAgent.generateText(
            `Tư vấn phân bổ danh mục vàng. Câu hỏi: "${message}"`,
            { userId, conversationId: convId },
          );
          analysisResults.portfolioAdvice = r.text;
          agentsUsed.push("portfolio-advisor-agent");
        } catch { /* skip */ }
      }

      // --- Step 7: Risk ---
      if (intent.needRisk) {
        send({ type: "progress", step: "risk", message: "Đang đánh giá rủi ro và Stop Loss / Take Profit..." });
        try {
          const r = await riskManagementAgent.generateText(
            `Đánh giá rủi ro đầu tư vàng. Câu hỏi: "${message}"`,
            { userId, conversationId: convId },
          );
          analysisResults.riskAssessment = r.text;
          agentsUsed.push("risk-management-agent");
        } catch { /* skip */ }
      }

      // --- Step 8: STREAM final response ---
      send({ type: "progress", step: "response", message: "Đang tổng hợp phân tích cuối cùng..." });

      const resultsSummary = Object.entries(analysisResults)
        .map(([k, v]) => `## ${k}\n${v}`)
        .join("\n\n");

      const finalPrompt = `Tổng hợp phân tích thị trường vàng cho câu hỏi của người dùng.

CÂU HỎI GỐC: "${message}"
HỒ SƠ ĐẦU TƯ: ${JSON.stringify(userProfile ?? "Chưa có thông tin")}

KẾT QUẢ PHÂN TÍCH:
${resultsSummary || "Phân tích thị trường vàng cơ bản"}

Tổng hợp bằng tiếng Việt, markdown rõ ràng, kèm disclaimer rủi ro đầu tư.`;

      let fullAnswer = "";

      try {
        const streamResult = await responseAgent.streamText(finalPrompt, { userId, conversationId: convId });
        for await (const chunk of streamResult.textStream) {
          fullAnswer += chunk;
          send({ type: "token", content: chunk });
        }
      } catch {
        const r = await responseAgent.generateText(finalPrompt, { userId, conversationId: convId });
        fullAnswer = r.text;
        for (let i = 0; i < fullAnswer.length; i += 50) {
          send({ type: "token", content: fullAnswer.slice(i, i + 50) });
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Lưu lịch sử vào PostgreSQL
      await userMemoryService.saveChatMessage(userId, convId, "user", message).catch(() => {});
      await userMemoryService.saveChatMessage(userId, convId, "assistant", fullAnswer, {
        agentsUsed: [...agentsUsed, "response-agent"],
        streaming: true,
      }).catch(() => {});

      send({
        type: "done",
        agentsUsed: [...agentsUsed, "response-agent"],
        memoryUsed: !!userProfile,
        disclaimer: "Đây là thông tin tham khảo, không phải lời khuyên đầu tư.",
        meta: { conversationId: convId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      send({ type: "error", message: `Lỗi xử lý: ${msg}` });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
