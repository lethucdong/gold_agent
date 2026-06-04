import { pgPool } from "../infrastructure/database.js";
import { logger } from "../infrastructure/logger.js";
import type { UserProfile } from "../domain/types.js";

export class UserMemoryService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await pgPool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        userId: row.user_id,
        name: row.name,
        investmentStyle: row.investment_style,
        riskProfile: row.risk_profile,
        portfolioValue: Number(row.portfolio_value),
        investmentGoals: row.investment_goals ?? [],
        goldPercentage: Number(row.gold_percentage),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      logger.warn("Failed to get user profile", { err, userId });
      return null;
    }
  }

  async upsertProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const result = await pgPool.query(
        `INSERT INTO user_profiles (user_id, name, investment_style, risk_profile, portfolio_value, investment_goals, gold_percentage)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, user_profiles.name),
           investment_style = COALESCE(EXCLUDED.investment_style, user_profiles.investment_style),
           risk_profile = COALESCE(EXCLUDED.risk_profile, user_profiles.risk_profile),
           portfolio_value = COALESCE(EXCLUDED.portfolio_value, user_profiles.portfolio_value),
           investment_goals = COALESCE(EXCLUDED.investment_goals, user_profiles.investment_goals),
           gold_percentage = COALESCE(EXCLUDED.gold_percentage, user_profiles.gold_percentage),
           updated_at = NOW()
         RETURNING *`,
        [
          userId,
          updates.name ?? "",
          updates.investmentStyle ?? "moderate",
          updates.riskProfile ?? "medium",
          updates.portfolioValue ?? 0,
          JSON.stringify(updates.investmentGoals ?? []),
          updates.goldPercentage ?? 10,
        ],
      );
      const row = result.rows[0];
      return {
        userId: row.user_id,
        name: row.name,
        investmentStyle: row.investment_style,
        riskProfile: row.risk_profile,
        portfolioValue: Number(row.portfolio_value),
        investmentGoals: row.investment_goals ?? [],
        goldPercentage: Number(row.gold_percentage),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      logger.warn("Failed to upsert user profile, returning default", { err, userId });
      return {
        userId,
        name: updates.name ?? "Unknown",
        investmentStyle: updates.investmentStyle ?? "moderate",
        riskProfile: updates.riskProfile ?? "medium",
        portfolioValue: updates.portfolioValue ?? 0,
        investmentGoals: updates.investmentGoals ?? [],
        goldPercentage: updates.goldPercentage ?? 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  async saveChatMessage(
    userId: string,
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await pgPool.query(
        `INSERT INTO chat_history (user_id, conversation_id, role, content, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [userId, conversationId, role, content, JSON.stringify(metadata)],
      );
    } catch (err) {
      logger.warn("Failed to save chat message", { err });
    }
  }

  async getChatHistory(userId: string, limit = 10): Promise<Array<{ role: string; content: string }>> {
    try {
      const result = await pgPool.query(
        `SELECT role, content FROM chat_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit],
      );
      return result.rows.reverse();
    } catch (err) {
      logger.warn("Failed to get chat history", { err });
      return [];
    }
  }
}

export const userMemoryService = new UserMemoryService();
