import { createPinoLogger } from "@voltagent/logger";
import type { LogLevel } from "@voltagent/internal";

const level = (process.env.LOG_LEVEL ?? "info") as LogLevel;

export const logger = createPinoLogger({
  name: "gold-market-ai",
  level,
});
