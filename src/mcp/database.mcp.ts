import { MCPConfiguration } from "@voltagent/core";
import { config } from "../config/index.js";

export function createDatabaseMCPTools() {
  const connectionString = config.postgres.connectionString;

  return new MCPConfiguration({
    servers: {
      postgres: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres", connectionString],
        env: {},
      },
    },
  });
}
