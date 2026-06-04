import { MCPConfiguration } from "@voltagent/core";

export const marketMCPConfig = {
  name: "market-mcp",
  description: "MCP server for gold and forex market data",
  servers: {
    goldMarket: {
      type: "stdio" as const,
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-everything"],
      env: {
        MARKET_API_KEY: process.env.MARKET_DATA_API_KEY ?? "",
      },
    },
  },
};

export function createMarketMCPTools() {
  return new MCPConfiguration({
    servers: {
      goldMarket: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-everything"],
        env: {
          MARKET_API_KEY: process.env.MARKET_DATA_API_KEY ?? "",
        },
      },
    },
  });
}
