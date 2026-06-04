import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { initDatabase } from "../src/infrastructure/database.js";
import { goldAnalysisWorkflow } from "../src/workflows/gold-analysis.workflow.js";
import { supervisorAgent } from "../src/agents/supervisor.agent.js";
import { DISCLAIMER } from "../src/shared/guardrails.js";

export const config = { maxDuration: 300 };

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

  try {
    await ensureInit();

    const startTime = Date.now();
    const execution = await goldAnalysisWorkflow.run({ userId, message, conversationId: convId });
    const duration = Date.now() - startTime;
    const result = execution.result;

    if (!result) throw new Error("Workflow completed without result");

    return res.status(200).json({
      answer: result.answer,
      confidence: result.confidence,
      agentsUsed: result.agentsUsed,
      sources: result.sources,
      memoryUsed: result.memoryUsed,
      disclaimer: result.disclaimer || DISCLAIMER,
      meta: { conversationId: convId, processingTimeMs: duration },
    });
  } catch (err) {
    // Fallback to supervisor agent
    try {
      const fallback = await supervisorAgent.generateText(message, { userId, conversationId: convId });
      return res.status(200).json({
        answer: fallback.text,
        confidence: 0.7,
        agentsUsed: ["gold-market-supervisor"],
        sources: [],
        memoryUsed: false,
        disclaimer: DISCLAIMER,
        meta: { conversationId: convId, fallback: true },
      });
    } catch {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return res.status(500).json({ error: "Xử lý yêu cầu thất bại.", detail: msg });
    }
  }
}
