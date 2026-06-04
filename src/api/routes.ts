import { handleChat, handleHealth } from "./chat.handler.js";
import { handleChatStream } from "./chat-stream.handler.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerRoutes(app: any): void {
  app.post("/api/chat", handleChat);
  app.post("/api/chat/stream", handleChatStream); // SSE streaming endpoint
  app.get("/api/health", handleHealth);
  app.get("/api/info", (c: { json: (data: unknown) => unknown }) =>
    c.json({
      name: "Gold Market Expert AI",
      description: "Hệ thống AI phân tích thị trường vàng chuyên nghiệp",
      version: "1.0.0",
      agents: [
        "Supervisor Agent",
        "Intent Agent",
        "Gold Analysis Agent",
        "News Research Agent",
        "Macro Economics Agent",
        "Portfolio Advisor Agent",
        "Risk Management Agent",
        "Response Agent",
      ],
      endpoints: {
        chat: "POST /api/chat",
        health: "GET /api/health",
        voltAgent: "GET /agents (VoltAgent built-in)",
      },
    }),
  );
}
