import { createTool } from "@voltagent/core";
import { z } from "zod";
import { userMemoryService } from "../memory/user-memory.service.js";

export const saveUserProfileTool = createTool({
  name: "saveUserProfile",
  description:
    "Lưu hoặc cập nhật hồ sơ đầu tư của người dùng vào cơ sở dữ liệu. Sử dụng khi học được thông tin mới về người dùng.",
  parameters: z.object({
    userId: z.string().describe("ID người dùng"),
    name: z.string().optional().describe("Tên người dùng"),
    investmentStyle: z
      .enum(["conservative", "moderate", "aggressive"])
      .optional()
      .describe("Phong cách đầu tư: conservative (thận trọng), moderate (cân bằng), aggressive (tích cực)"),
    riskProfile: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Khẩu vị rủi ro: low (thấp), medium (trung bình), high (cao)"),
    portfolioValue: z.number().optional().describe("Tổng giá trị danh mục đầu tư (VND)"),
    goldPercentage: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Tỷ lệ % vàng trong danh mục hiện tại"),
    investmentGoals: z.array(z.string()).optional().describe("Mục tiêu đầu tư"),
  }),
  execute: async ({ userId, ...updates }) => {
    const profile = await userMemoryService.upsertProfile(userId, {
      name: updates.name,
      investmentStyle: updates.investmentStyle,
      riskProfile: updates.riskProfile,
      portfolioValue: updates.portfolioValue,
      goldPercentage: updates.goldPercentage,
      investmentGoals: updates.investmentGoals,
    });

    return {
      success: true,
      userId,
      savedFields: Object.keys(updates).filter((k) => updates[k as keyof typeof updates] !== undefined),
      profile: {
        name: profile.name,
        investmentStyle: profile.investmentStyle,
        riskProfile: profile.riskProfile,
        portfolioValue: profile.portfolioValue,
        goldPercentage: profile.goldPercentage,
      },
      message: "Hồ sơ đầu tư đã được cập nhật thành công",
    };
  },
});
