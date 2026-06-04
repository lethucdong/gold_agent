import pg from "pg";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pgPool = new Pool({
  connectionString: config.postgres.connectionString,
  ssl: config.postgres.ssl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pgPool.on("error", (err) => {
  logger.error("Unexpected PostgreSQL pool error", { err });
});

export async function initDatabase(): Promise<void> {
  const client = await pgPool.connect();
  try {
    // pgvector extension (Neon supports this natively)
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) DEFAULT '',
        investment_style VARCHAR(100) DEFAULT 'moderate',
        risk_profile VARCHAR(50) DEFAULT 'medium',
        portfolio_value DECIMAL(15,2) DEFAULT 0,
        investment_goals JSONB DEFAULT '[]'::jsonb,
        gold_percentage DECIMAL(5,2) DEFAULT 10,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        source VARCHAR(255) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        embedding vector(1536),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // IVFFlat index requires data to exist first; create only if table has rows
    const { rows } = await client.query(
      "SELECT COUNT(*) AS cnt FROM knowledge_chunks"
    );
    if (Number(rows[0].cnt) >= 100) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
        ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        conversation_id VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS chat_history_user_idx ON chat_history(user_id)"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS gold_market_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) NOT NULL,
        price DECIMAL(12,4) NOT NULL,
        price_usd DECIMAL(12,4),
        change_percent DECIMAL(8,4),
        volume DECIMAL(20,4),
        source VARCHAR(100) NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS gold_market_symbol_idx ON gold_market_data(symbol, recorded_at DESC)"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        session_data JSONB DEFAULT '{}'::jsonb,
        last_active TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    logger.info("Database initialized successfully (Neon PostgreSQL)");
  } catch (err) {
    logger.error("Database init failed", { err });
    throw err;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await pgPool.end();
  logger.info("Database pool closed");
}
