import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { goldAnalysisAgent } from "../agents/gold-analysis.agent.js";
import { newsResearchAgent } from "../agents/news-research.agent.js";
import { macroEconomicsAgent } from "../agents/macro-economics.agent.js";
import { portfolioAdvisorAgent } from "../agents/portfolio-advisor.agent.js";
import { riskManagementAgent } from "../agents/risk-management.agent.js";
import { responseAgent } from "../agents/response.agent.js";
import { userMemoryService } from "../memory/user-memory.service.js";
import { logger } from "../infrastructure/logger.js";

const WorkflowInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  conversationId: z.string().optional(),
});

const WorkflowResultSchema = z.object({
  answer: z.string(),
  confidence: z.number(),
  agentsUsed: z.array(z.string()),
  sources: z.array(z.string()),
  memoryUsed: z.boolean(),
  disclaimer: z.string(),
});

type WorkflowState = {
  userId: string;
  message: string;
  conversationId?: string;
  intent: {
    intent: string;
    needNews: boolean;
    needMacro: boolean;
    needTechnical: boolean;
    needPortfolio: boolean;
    needRisk: boolean;
    confidence: number;
    reasoning: string;
  };
  userProfile: unknown;
  memoryUsed: boolean;
  agentsUsed: string[];
  analysisResults: Record<string, string>;
};

export const goldAnalysisWorkflow = createWorkflowChain({
  id: "gold-market-analysis",
  name: "Gold Market Analysis Workflow",
  purpose: "Phân tích toàn diện thị trường vàng và đưa ra tư vấn cá nhân hóa",
  input: WorkflowInputSchema,
  result: WorkflowResultSchema,
})
  // Step 1: Detect intent via agent
  .andAgent(
    async ({ data }) => `Phân loại câu hỏi sau về thị trường vàng và trả về JSON:\n"${data.message}"`,
    goldAnalysisAgent,
    {
      schema: z.object({
        intent: z.string().optional().default("market_analysis"),
        needNews: z.boolean().optional().default(true),
        needMacro: z.boolean().optional().default(false),
        needTechnical: z.boolean().optional().default(true),
        needPortfolio: z.boolean().optional().default(false),
        needRisk: z.boolean().optional().default(false),
        confidence: z.number().optional().default(0.8),
        reasoning: z.string().optional().default(""),
      }),
    },
    async (output, context) => ({
      ...context.data,
      intent: {
        intent: output.intent ?? "market_analysis",
        needNews: output.needNews ?? true,
        needMacro: output.needMacro ?? false,
        needTechnical: output.needTechnical ?? true,
        needPortfolio: output.needPortfolio ?? false,
        needRisk: output.needRisk ?? false,
        confidence: output.confidence ?? 0.8,
        reasoning: output.reasoning ?? "",
      },
      agentsUsed: ["gold-analysis-agent"],
      analysisResults: {} as Record<string, string>,
      userProfile: null,
      memoryUsed: false,
    }),
  )

  // Step 2: Retrieve user memory from PostgreSQL
  .andThen({
    id: "retrieve-user-memory",
    name: "Retrieve User Memory",
    execute: async ({ data }) => {
      const d = data as WorkflowState;
      const profile = await userMemoryService.getProfile(d.userId);
      const history = await userMemoryService.getChatHistory(d.userId, 5);
      logger.info("User memory retrieved", { userId: d.userId, hasProfile: !!profile });
      return {
        ...d,
        userProfile: profile,
        chatHistory: history,
        memoryUsed: !!profile,
      };
    },
  })

  // Step 3: Technical analysis (when needed)
  .andThen({
    id: "gold-technical-analysis",
    name: "Gold Technical Analysis",
    execute: async ({ data }) => {
      const d = data as WorkflowState & { chatHistory: unknown[] };
      if (!d.intent?.needTechnical) return d;

      try {
        const result = await goldAnalysisAgent.generateText(
          `Phân tích kỹ thuật đầy đủ giá vàng. Sử dụng tools để lấy giá XAUUSD, SJC, PNJ và phân tích kỹ thuật. Câu hỏi gốc: "${d.message}"`,
          { userId: d.userId, conversationId: d.conversationId },
        );
        return {
          ...d,
          agentsUsed: [...d.agentsUsed, "gold-analysis-agent"],
          analysisResults: { ...d.analysisResults, technicalAnalysis: result.text },
        };
      } catch {
        return d;
      }
    },
  })

  // Step 4: News research (when needed)
  .andThen({
    id: "news-research",
    name: "News Research",
    execute: async ({ data }) => {
      const d = data as WorkflowState;
      if (!d.intent?.needNews) return d;

      try {
        const result = await newsResearchAgent.generateText(
          `Nghiên cứu và phân tích tin tức thị trường vàng hiện tại. Câu hỏi: "${d.message}"`,
          { userId: d.userId, conversationId: d.conversationId },
        );
        return {
          ...d,
          agentsUsed: [...d.agentsUsed, "news-research-agent"],
          analysisResults: { ...d.analysisResults, newsAnalysis: result.text },
        };
      } catch {
        return d;
      }
    },
  })

  // Step 5: Macro economics (when needed)
  .andThen({
    id: "macro-economics",
    name: "Macro Economics Analysis",
    execute: async ({ data }) => {
      const d = data as WorkflowState;
      if (!d.intent?.needMacro) return d;

      try {
        const result = await macroEconomicsAgent.generateText(
          `Phân tích môi trường kinh tế vĩ mô tác động đến vàng. Câu hỏi: "${d.message}"`,
          { userId: d.userId, conversationId: d.conversationId },
        );
        return {
          ...d,
          agentsUsed: [...d.agentsUsed, "macro-economics-agent"],
          analysisResults: { ...d.analysisResults, macroAnalysis: result.text },
        };
      } catch {
        return d;
      }
    },
  })

  // Step 6: Portfolio advice (when needed)
  .andThen({
    id: "portfolio-advice",
    name: "Portfolio Advisor",
    execute: async ({ data }) => {
      const d = data as WorkflowState;
      if (!d.intent?.needPortfolio) return d;

      try {
        const result = await portfolioAdvisorAgent.generateText(
          `Tư vấn phân bổ danh mục đầu tư vàng cho userId "${d.userId}". Câu hỏi: "${d.message}"`,
          { userId: d.userId, conversationId: d.conversationId },
        );
        return {
          ...d,
          agentsUsed: [...d.agentsUsed, "portfolio-advisor-agent"],
          analysisResults: { ...d.analysisResults, portfolioAdvice: result.text },
        };
      } catch {
        return d;
      }
    },
  })

  // Step 7: Risk assessment (when needed)
  .andThen({
    id: "risk-assessment",
    name: "Risk Management",
    execute: async ({ data }) => {
      const d = data as WorkflowState;
      if (!d.intent?.needRisk) return d;

      try {
        const result = await riskManagementAgent.generateText(
          `Đánh giá rủi ro đầu tư vàng cho userId "${d.userId}". Câu hỏi: "${d.message}"`,
          { userId: d.userId, conversationId: d.conversationId },
        );
        return {
          ...d,
          agentsUsed: [...d.agentsUsed, "risk-management-agent"],
          analysisResults: { ...d.analysisResults, riskAssessment: result.text },
        };
      } catch {
        return d;
      }
    },
  })

  // Step 8: Synthesize final response
  .andAgent(
    async ({ data }) => {
      const d = data as WorkflowState;
      const results = Object.entries(d.analysisResults ?? {})
        .map(([key, value]) => `## ${key}\n${value}`)
        .join("\n\n");

      return `Tổng hợp phân tích thị trường vàng cho câu hỏi của người dùng.

CÂU HỎI GỐC: "${d.message}"

HỒ SƠ NGƯỜI DÙNG: ${JSON.stringify(d.userProfile ?? "Chưa có thông tin")}

KẾT QUẢ PHÂN TÍCH TỪ CÁC CHUYÊN GIA:
${results || "Đang phân tích thị trường vàng cơ bản"}

Hãy tổng hợp thành phản hồi hoàn chỉnh, có cấu trúc rõ ràng bằng tiếng Việt với disclaimer rủi ro.`;
    },
    responseAgent,
    {
      schema: z.object({
        answer: z.string(),
        confidence: z.number().min(0).max(100).optional().default(75),
        sources: z.array(z.string()).optional().default([]),
        disclaimer: z.string().optional().default("Đây là thông tin tham khảo, không phải lời khuyên đầu tư."),
      }),
    },
    async (output, context) => {
      const d = context.data as WorkflowState;

      const convId = d.conversationId ?? `conv_${Date.now()}`;
      await userMemoryService.saveChatMessage(d.userId, convId, "user", d.message).catch(() => {});
      await userMemoryService.saveChatMessage(d.userId, convId, "assistant", output.answer, {
        confidence: output.confidence,
        agentsUsed: d.agentsUsed,
      }).catch(() => {});

      return {
        answer: output.answer,
        confidence: (output.confidence ?? 75) / 100,
        agentsUsed: [...d.agentsUsed, "response-agent"],
        sources: output.sources ?? [],
        memoryUsed: d.memoryUsed ?? false,
        disclaimer: output.disclaimer ?? "Đây là thông tin tham khảo, không phải lời khuyên đầu tư.",
      };
    },
  );
