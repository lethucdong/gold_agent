import { MCPConfiguration } from "@voltagent/core";

export function createNewsMCPTools() {
  return new MCPConfiguration({
    servers: {
      newsSearch: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search"],
        env: {
          BRAVE_API_KEY: process.env.BRAVE_SEARCH_API_KEY ?? "",
        },
      },
    },
  });
}
