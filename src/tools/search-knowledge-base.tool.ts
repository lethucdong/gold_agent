import { createTool } from "@voltagent/core";
import { z } from "zod";
import { knowledgeBaseService } from "../rag/knowledge-base.service.js";

export const searchKnowledgeBaseTool = createTool({
  name: "searchKnowledgeBase",
  description:
    "Tìm kiếm knowledge base về đầu tư vàng: World Gold Council, tài liệu FED, báo cáo đầu tư, phân tích kỹ thuật. Sử dụng vector search để tìm thông tin liên quan nhất.",
  parameters: z.object({
    query: z.string().describe("Câu hỏi hoặc chủ đề cần tìm kiếm trong knowledge base"),
    limit: z.number().min(1).max(10).optional().default(3).describe("Số lượng kết quả tối đa"),
  }),
  execute: async ({ query, limit }) => {
    const results = await knowledgeBaseService.search(query, limit);

    if (results.length === 0) {
      return {
        found: false,
        results: [],
        message: "Không tìm thấy thông tin liên quan trong knowledge base",
      };
    }

    return {
      found: true,
      results: results.map((r) => ({
        content: r.content,
        source: r.source,
        similarity: r.similarity ? Math.round(r.similarity * 100) / 100 : undefined,
        metadata: r.metadata,
      })),
      sources: [...new Set(results.map((r) => r.source))],
      message: `Tìm thấy ${results.length} đoạn thông tin liên quan`,
    };
  },
});
