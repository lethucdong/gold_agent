import { pgPool } from "../infrastructure/database.js";
import { logger } from "../infrastructure/logger.js";
import { embedText, chunkText } from "./embedder.js";
import type { KnowledgeChunk } from "../domain/types.js";

export class KnowledgeBaseService {
  async addDocument(content: string, source: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const chunks = chunkText(content, 500, 50);
    const embeddings = await Promise.all(chunks.map(embedText));

    for (let i = 0; i < chunks.length; i++) {
      try {
        await pgPool.query(
          `INSERT INTO knowledge_chunks (content, source, metadata, embedding) VALUES ($1, $2, $3, $4)`,
          [
            chunks[i],
            source,
            JSON.stringify({ ...metadata, chunkIndex: i, totalChunks: chunks.length }),
            JSON.stringify(embeddings[i]),
          ],
        );
      } catch (err) {
        logger.warn("Failed to insert knowledge chunk", { err, source });
      }
    }

    logger.info("Document added to knowledge base", { source, chunks: chunks.length });
  }

  async search(query: string, limit = 5): Promise<KnowledgeChunk[]> {
    try {
      const queryEmbedding = await embedText(query);

      const result = await pgPool.query(
        `SELECT id, content, source, metadata,
                1 - (embedding <=> $1::vector) AS similarity
         FROM knowledge_chunks
         WHERE 1 - (embedding <=> $1::vector) > 0.7
         ORDER BY similarity DESC
         LIMIT $2`,
        [JSON.stringify(queryEmbedding), limit],
      );

      return result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        source: row.source,
        metadata: row.metadata ?? {},
        similarity: Number(row.similarity),
      }));
    } catch (err) {
      logger.warn("Knowledge base search failed", { err });
      return [];
    }
  }

  async seedDefaultKnowledge(): Promise<void> {
    const count = await pgPool
      .query("SELECT COUNT(*) FROM knowledge_chunks")
      .then((r) => Number(r.rows[0].count))
      .catch(() => 0);

    if (count > 0) return;

    const documents = [
      {
        content: `Vàng là tài sản trú ẩn an toàn truyền thống. Trong thời kỳ khủng hoảng kinh tế, lạm phát cao, hay bất ổn địa chính trị, nhà đầu tư thường chuyển sang vàng như một phương tiện bảo toàn giá trị. Đồng USD và vàng thường có tương quan nghịch chiều - khi USD yếu, vàng thường tăng giá. Lãi suất thực âm cũng hỗ trợ giá vàng vì chi phí cơ hội giữ vàng giảm xuống.`,
        source: "World Gold Council - Gold Investment Basics",
      },
      {
        content: `Phân tích kỹ thuật vàng XAUUSD: SMA20 là đường trung bình ngắn hạn, SMA50 là trung hạn, SMA200 là dài hạn. Khi giá vượt SMA200 là tín hiệu tăng giá mạnh. RSI trên 70 cho thấy vùng quá mua, dưới 30 là quá bán. MACD cắt lên đường tín hiệu là mua, cắt xuống là bán. Bollinger Bands thu hẹp báo hiệu biến động sắp tăng.`,
        source: "Technical Analysis Documentation",
      },
      {
        content: `FED và chính sách tiền tệ ảnh hưởng đến vàng: Khi FED tăng lãi suất, USD mạnh lên, vàng có xu hướng giảm. Ngược lại, khi FED cắt giảm lãi suất hoặc thực hiện QE, vàng thường tăng giá. FOMC họp 8 lần/năm và quyết định lãi suất là sự kiện quan trọng nhất với thị trường vàng. Dot plot của FED cũng cần theo dõi sát.`,
        source: "FED Documents - Monetary Policy Impact",
      },
      {
        content: `CPI và PPI là thước đo lạm phát quan trọng. CPI cao hơn dự báo thường hỗ trợ giá vàng vì vàng là hàng rào chống lạm phát. Tuy nhiên, CPI cao cũng có thể khiến FED tăng lãi suất, tạo áp lực giảm cho vàng. NFP - báo cáo việc làm phi nông nghiệp Mỹ ảnh hưởng đến kỳ vọng chính sách tiền tệ.`,
        source: "Gold Investment Reports - Macro Indicators",
      },
      {
        content: `Phân bổ danh mục đầu tư vàng: Các chuyên gia thường khuyến nghị 5-15% danh mục đầu tư vào vàng tùy theo khẩu vị rủi ro. Nhà đầu tư bảo thủ: 5-10%, nhà đầu tư trung bình: 10-15%, nhà đầu tư tích cực: 10-20%. Vàng có tương quan thấp với cổ phiếu và trái phiếu, giúp đa dạng hóa danh mục hiệu quả. SJC và PNJ là các đơn vị kinh doanh vàng miếng uy tín tại Việt Nam.`,
        source: "Trading Psychology - Portfolio Allocation",
      },
    ];

    for (const doc of documents) {
      await this.addDocument(doc.content, doc.source).catch(() => {});
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
