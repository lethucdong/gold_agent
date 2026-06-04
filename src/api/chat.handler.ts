import type { Context } from "hono";
import { z } from "zod";
import { goldAnalysisWorkflow } from "../workflows/gold-analysis.workflow.js";
import { supervisorAgent } from "../agents/supervisor.agent.js";
import { logger } from "../infrastructure/logger.js";
import { DISCLAIMER } from "../shared/guardrails.js";

const ChatRequestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export async function handleChat(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.errors }, 400);
  }

  const { userId, message, conversationId } = parsed.data;
  const convId = conversationId ?? `conv_${userId}_${Date.now()}`;

  logger.info("Chat request received", { userId, messageLength: message.length });

  try {
    const startTime = Date.now();
    const execution = await goldAnalysisWorkflow.run({ userId, message, conversationId: convId });
    const duration = Date.now() - startTime;
    const result = execution.result;

    if (!result) {
      throw new Error("Workflow completed without result");
    }

    logger.info("Chat request processed", { userId, duration, agentsUsed: result.agentsUsed });

    return c.json({
      answer: result.answer,
      confidence: result.confidence,
      agentsUsed: result.agentsUsed,
      sources: result.sources,
      memoryUsed: result.memoryUsed,
      disclaimer: result.disclaimer || DISCLAIMER,
      meta: {
        conversationId: convId,
        processingTimeMs: duration,
      },
    });
  } catch (err) {
    logger.error("Workflow execution failed, falling back to supervisor agent", { err, userId });

    try {
      const fallbackResult = await supervisorAgent.generateText(message, {
        userId,
        conversationId: convId,
      });

      return c.json({
        answer: fallbackResult.text,
        confidence: 0.7,
        agentsUsed: ["gold-market-supervisor"],
        sources: [],
        memoryUsed: false,
        disclaimer: DISCLAIMER,
        meta: { conversationId: convId, fallback: true },
      });
    } catch (fallbackErr) {
      logger.error("Fallback also failed", { err: fallbackErr, userId });
      return c.json(
        {
          error: "Xử lý yêu cầu thất bại. Vui lòng thử lại.",
          disclaimer: DISCLAIMER,
        },
        500,
      );
    }
  }
}

export async function handleHealth(c: Context) {
  return c.json({
    status: "ok",
    service: "Gold Market Expert AI",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
