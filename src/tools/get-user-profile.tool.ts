import { createTool } from "@voltagent/core";
import { z } from "zod";
import { userMemoryService } from "../memory/user-memory.service.js";

export const getUserProfileTool = createTool({
  name: "getUserProfile",
  description:
    "Lấy hồ sơ đầu tư của người dùng từ cơ sở dữ liệu: phong cách đầu tư, khẩu vị rủi ro, giá trị danh mục, mục tiêu đầu tư.",
  parameters: z.object({
    userId: z.string().describe("ID người dùng cần lấy thông tin"),
  }),
  execute: async ({ userId }) => {
    const profile = await userMemoryService.getProfile(userId);

    if (!profile) {
      return {
        found: false,
        userId,
        message: "Chưa có hồ sơ đầu tư. Đây là lần đầu tiên người dùng này sử dụng hệ thống.",
        defaultProfile: {
          investmentStyle: "moderate",
          riskProfile: "medium",
          portfolioValue: 0,
          goldPercentage: 10,
          investmentGoals: [],
        },
      };
    }

    const chatHistory = await userMemoryService.getChatHistory(userId, 5);

    return {
      found: true,
      profile: {
        userId: profile.userId,
        name: profile.name,
        investmentStyle: profile.investmentStyle,
        riskProfile: profile.riskProfile,
        portfolioValue: profile.portfolioValue,
        goldPercentage: profile.goldPercentage,
        investmentGoals: profile.investmentGoals,
        updatedAt: profile.updatedAt.toISOString(),
      },
      recentInteractions: chatHistory.length,
      contextSummary: `${profile.name || "Người dùng"} có phong cách ${profile.investmentStyle}, khẩu vị rủi ro ${profile.riskProfile}, danh mục ${profile.portfolioValue.toLocaleString("vi-VN")} VND`,
    };
  },
});
