import { VoltAgentObservability, VoltOpsClient } from "@voltagent/core";
import { LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { config } from "../config/index.js";

export const voltOpsClient = new VoltOpsClient({
  publicKey: config.voltops.publicKey,
  secretKey: config.voltops.secretKey,
});

export const observability = new VoltAgentObservability({
  storage: new LibSQLObservabilityAdapter({
    url: config.libsql.url,
    authToken: config.libsql.authToken,
  }),
});
