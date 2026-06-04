export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: "anthropic/claude-haiku-4-5-20251001",
    embeddingModel: "openai/text-embedding-3-small",
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  },
  postgres: {
    connectionString:
      process.env.DATABASE_URL ??
      `postgresql://${process.env.POSTGRES_USER ?? "postgres"}:${process.env.POSTGRES_PASSWORD ?? "postgres"}@${process.env.POSTGRES_HOST ?? "localhost"}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? "gold_ai"}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  },
  libsql: {
    url: process.env.LIBSQL_URL ?? "file:./.voltagent/memory.db",
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  },
  voltops: {
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
  },
  server: {
    port: Number(process.env.PORT ?? 3141),
  },
  news: {
    apiKey: process.env.NEWS_API_KEY ?? "",
  },
  marketData: {
    apiKey: process.env.MARKET_DATA_API_KEY ?? "",
  },
} as const;
