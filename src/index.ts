import "dotenv/config";
import { VoltAgent, VoltOpsClient, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";
import { config } from "./config/index.js";
import { logger } from "./infrastructure/logger.js";
import { observability } from "./infrastructure/observability.js";
import { initDatabase } from "./infrastructure/database.js";
import { knowledgeBaseService } from "./rag/knowledge-base.service.js";
import { supervisorAgent } from "./agents/supervisor.agent.js";
import { goldAnalysisAgent } from "./agents/gold-analysis.agent.js";
import { newsResearchAgent } from "./agents/news-research.agent.js";
import { macroEconomicsAgent } from "./agents/macro-economics.agent.js";
import { portfolioAdvisorAgent } from "./agents/portfolio-advisor.agent.js";
import { riskManagementAgent } from "./agents/risk-management.agent.js";
import { responseAgent } from "./agents/response.agent.js";
import { intentAgent } from "./agents/intent.agent.js";
import { goldAnalysisWorkflow } from "./workflows/gold-analysis.workflow.js";
import { registerRoutes } from "./api/routes.js";

async function bootstrap() {
  logger.info("Starting Gold Market Expert AI...");

  await initDatabase();

  await knowledgeBaseService.seedDefaultKnowledge().catch((err) => {
    logger.warn("Knowledge base seeding skipped", { err });
  });

  const _memory = new Memory({
    storage: new LibSQLMemoryAdapter({
      url: config.libsql.url,
      authToken: config.libsql.authToken,
      logger: logger.child({ component: "libsql-memory" }),
    }),
    workingMemory: {
      enabled: true,
      scope: "conversation",
    },
  });

  const voltOpsClient = new VoltOpsClient({
    publicKey: config.voltops.publicKey,
    secretKey: config.voltops.secretKey,
  });

  new VoltAgent({
    agents: {
      supervisor: supervisorAgent,
      intent: intentAgent,
      goldAnalysis: goldAnalysisAgent,
      newsResearch: newsResearchAgent,
      macroEconomics: macroEconomicsAgent,
      portfolioAdvisor: portfolioAdvisorAgent,
      riskManagement: riskManagementAgent,
      response: responseAgent,
    },
    workflows: {
      goldAnalysis: goldAnalysisWorkflow,
    },
    server: honoServer({
      port: config.server.port,
      configureApp: (app) => {
        registerRoutes(app);
        logger.info("Custom API routes registered");
      },
    }),
    logger,
    observability,
    voltOpsClient,
  });

  logger.info("Gold Market Expert AI started successfully", {
    port: config.server.port,
    agents: 8,
    workflows: 1,
  });
}

bootstrap().catch((err) => {
  logger.error("Fatal startup error", { err });
  process.exit(1);
});
