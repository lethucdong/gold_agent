import "dotenv/config";
import "@ai-sdk/openai-compatible"; // force Vercel bundler to include OpenRouter provider
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { initDatabase } from "../src/infrastructure/database.js";
import { goldAnalysisAgent } from "../src/agents/gold-analysis.agent.js";
import { newsResearchAgent } from "../src/agents/news-research.agent.js";
import { macroEconomicsAgent } from "../src/agents/macro-economics.agent.js";
import { portfolioAdvisorAgent } from "../src/agents/portfolio-advisor.agent.js";
import { riskManagementAgent } from "../src/agents/risk-management.agent.js";
import { responseAgent } from "../src/agents/response.agent.js";
import { userMemoryService } from "../src/memory/user-memory.service.js";

// maxDuration cho Vercel Pro/Enterprise (giây)
export const config = { maxDuration: 300 };

// Khởi tạo DB một lần duy nhất per serverless instance (warm reuse)
let initialized = false;
async function ensureInit() {
  if (initialized) return;
  await initDatabase();
  initialized = true;
}

const RequestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
  }

  const { userId, message, conversationId } = parsed.data;
  const convId = conversationId ?? `conv_${userId}_${Date.now()}`;

  // SSE headers — giữ connection sống trong suốt quá trình xử lý
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // tắt nginx buffering
  res.flushHeaders();

  const send = (data: object) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    await ensureInit();

    // --- Bước 1: Phân loại intent ---
    send({ type: "progress", step: "intent", message: "Đang phân tích câu hỏi của bạn..." });

    let intent = {
      needNews: true,
      needMacro: false,
      needTechnical: true,
      needPortfolio: false,
      needRisk: false,
    };
    try {
      const intentResult = await goldAnalysisAgent.generateText(
        `Phân loại câu hỏi sau và trả về JSON với các boolean field: needNews, needMacro, needTechnical, needPortfolio, needRisk.\nCâu hỏi: "${message}"`,
        { userId, conversationId: convId },
      );
      const match = intentResult.text.match(/\{[\s\S]*?\}/);
      if (match) intent = { ...intent, ...JSON.parse(match[0]) };
    } catch {
      /* dùng defaults */
    }

    // --- Bước 2: Tải hồ sơ người dùng ---
    send({ type: "progress", step: "memory", message: "Đang tải hồ sơ đầu tư của bạn..." });
    const userProfile = await userMemoryService.getProfile(userId);

    const analysisResults: Record<string, string> = {};
    const agentsUsed: string[] = [];

    // --- Bước 3: Phân tích kỹ thuật ---
    if (intent.needTechnical) {
      send({
        type: "progress",
        step: "technical",
        message: "Đang phân tích kỹ thuật XAUUSD, SJC, PNJ...",
      });
      try {
        const r = await goldAnalysisAgent.generateText(
          `Phân tích kỹ thuật đầy đủ giá vàng XAUUSD, SJC, PNJ. Câu hỏi gốc: "${message}"`,
          { userId, conversationId: convId },
        );
        analysisResults.technicalAnalysis = r.text;
        agentsUsed.push("gold-analysis-agent");
      } catch {
        /* bỏ qua */
      }
    }

    // --- Bước 4: Nghiên cứu tin tức ---
    if (intent.needNews) {
      send({
        type: "progress",
        step: "news",
        message: "Đang nghiên cứu tin tức thị trường vàng...",
      });
      try {
        const r = await newsResearchAgent.generateText(
          `Nghiên cứu tin tức và tâm lý thị trường vàng hiện tại. Câu hỏi: "${message}"`,
          { userId, conversationId: convId },
        );
        analysisResults.newsAnalysis = r.text;
        agentsUsed.push("news-research-agent");
      } catch {
        /* bỏ qua */
      }
    }

    // --- Bước 5: Kinh tế vĩ mô ---
    if (intent.needMacro) {
      send({
        type: "progress",
        step: "macro",
        message: "Đang phân tích FED, CPI, NFP...",
      });
      try {
        const r = await macroEconomicsAgent.generateText(
          `Phân tích kinh tế vĩ mô tác động đến vàng. Câu hỏi: "${message}"`,
          { userId, conversationId: convId },
        );
        analysisResults.macroAnalysis = r.text;
        agentsUsed.push("macro-economics-agent");
      } catch {
        /* bỏ qua */
      }
    }

    // --- Bước 6: Tư vấn danh mục ---
    if (intent.needPortfolio) {
      send({
        type: "progress",
        step: "portfolio",
        message: "Đang tư vấn phân bổ danh mục đầu tư...",
      });
      try {
        const r = await portfolioAdvisorAgent.generateText(
          `Tư vấn phân bổ danh mục vàng. Câu hỏi: "${message}"`,
          { userId, conversationId: convId },
        );
        analysisResults.portfolioAdvice = r.text;
        agentsUsed.push("portfolio-advisor-agent");
      } catch {
        /* bỏ qua */
      }
    }

    // --- Bước 7: Đánh giá rủi ro ---
    if (intent.needRisk) {
      send({
        type: "progress",
        step: "risk",
        message: "Đang đánh giá rủi ro và Stop Loss / Take Profit...",
      });
      try {
        const r = await riskManagementAgent.generateText(
          `Đánh giá rủi ro đầu tư vàng. Câu hỏi: "${message}"`,
          { userId, conversationId: convId },
        );
        analysisResults.riskAssessment = r.text;
        agentsUsed.push("risk-management-agent");
      } catch {
        /* bỏ qua */
      }
    }

    // --- Bước 8: STREAM câu trả lời cuối (từng token) ---
    send({ type: "progress", step: "response", message: "Đang tổng hợp phân tích cuối cùng..." });

    const resultsSummary = Object.entries(analysisResults)
      .map(([k, v]) => `## ${k}\n${v}`)
      .join("\n\n");

    const finalPrompt = `Tổng hợp phân tích thị trường vàng cho câu hỏi của người dùng.

CÂU HỎI GỐC: "${message}"
HỒ SƠ ĐẦU TƯ: ${JSON.stringify(userProfile ?? "Chưa có thông tin")}

KẾT QUẢ PHÂN TÍCH TỪ CÁC CHUYÊN GIA:
${resultsSummary || "Phân tích thị trường vàng cơ bản"}

Hãy tổng hợp thành phân tích hoàn chỉnh bằng tiếng Việt, markdown rõ ràng, kèm disclaimer rủi ro đầu tư.`;

    let fullAnswer = "";

    try {
      const streamResult = await responseAgent.streamText(finalPrompt, {
        userId,
        conversationId: convId,
      });
      for await (const chunk of streamResult.textStream) {
        fullAnswer += chunk;
        send({ type: "token", content: chunk });
      }
    } catch {
      // fallback: generateText nếu streamText không hoạt động
      const r = await responseAgent.generateText(finalPrompt, { userId, conversationId: convId });
      fullAnswer = r.text;
      // Stream từng đoạn 50 ký tự để giả lập streaming
      for (let i = 0; i < fullAnswer.length; i += 50) {
        send({ type: "token", content: fullAnswer.slice(i, i + 50) });
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    // Lưu lịch sử vào PostgreSQL
    await userMemoryService.saveChatMessage(userId, convId, "user", message).catch(() => {});
    await userMemoryService
      .saveChatMessage(userId, convId, "assistant", fullAnswer, {
        agentsUsed: [...agentsUsed, "response-agent"],
        streaming: true,
      })
      .catch(() => {});

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
    if (!res.writableEnded) res.end();
  }
}
