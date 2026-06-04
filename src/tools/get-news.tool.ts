import { createTool } from "@voltagent/core";
import { z } from "zod";

const mockNewsData = [
  {
    title: "Gold Prices Rise as Fed Rate Cut Expectations Increase",
    source: "Reuters",
    sentiment: "bullish" as const,
    impact: "high" as const,
    summary:
      "Giá vàng tăng mạnh sau khi số liệu CPI Mỹ thấp hơn dự báo, làm tăng kỳ vọng FED sẽ cắt giảm lãi suất trong quý 3/2024. XAUUSD giao dịch quanh mức 2350 USD/oz.",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    title: "Central Banks Continue Gold Buying Spree",
    source: "Bloomberg",
    sentiment: "bullish" as const,
    impact: "high" as const,
    summary:
      "Các ngân hàng trung ương toàn cầu tiếp tục mua vàng ở mức kỷ lục. Trung Quốc, Nga và Ấn Độ dẫn đầu xu hướng đa dạng hóa dự trữ ngoại hối sang vàng, hỗ trợ giá vàng dài hạn.",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    title: "Strong US Dollar Pressures Gold",
    source: "Kitco",
    sentiment: "bearish" as const,
    impact: "medium" as const,
    summary:
      "Đồng USD tăng giá sau dữ liệu việc làm Mỹ tốt hơn dự báo, tạo áp lực giảm cho vàng. DXY chạm mức 104.5, khiến vàng tính theo USD trở nên đắt hơn với nhà đầu tư nước ngoài.",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    title: "Geopolitical Tensions Support Safe-Haven Demand",
    source: "Investing.com",
    sentiment: "bullish" as const,
    impact: "medium" as const,
    summary:
      "Căng thẳng địa chính trị ở Trung Đông và Ukraine tiếp tục hỗ trợ nhu cầu vàng như tài sản trú ẩn an toàn. Nhà đầu tư tổ chức tăng vị thế vàng trong bối cảnh bất ổn toàn cầu.",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    title: "Gold ETF Flows Show Mixed Signals",
    source: "Bloomberg",
    sentiment: "neutral" as const,
    impact: "low" as const,
    summary:
      "Dòng vốn vào các quỹ ETF vàng thế giới không đồng nhất: SPDR Gold Trust ghi nhận dòng vốn vào trong khi một số ETF nhỏ hơn ghi nhận dòng vốn ra, cho thấy nhà đầu tư thận trọng.",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
];

export const getNewsTool = createTool({
  name: "getNews",
  description:
    "Tìm kiếm và phân tích tin tức vàng từ Reuters, Bloomberg, Investing.com, Kitco. Đánh giá tâm lý thị trường (bullish/bearish/neutral) và mức độ tác động.",
  parameters: z.object({
    query: z.string().optional().default("gold market").describe("Từ khóa tìm kiếm tin tức"),
    sources: z
      .array(z.enum(["Reuters", "Bloomberg", "Investing", "Kitco"]))
      .optional()
      .default(["Reuters", "Bloomberg", "Investing", "Kitco"])
      .describe("Nguồn tin tức cần tìm kiếm"),
    limit: z.number().min(1).max(10).optional().default(5).describe("Số lượng bài báo tối đa"),
  }),
  execute: async ({ query: _query, sources, limit }) => {
    // TODO: Replace with real news API (e.g., NewsAPI, Aylien, Alpaca News)
    // const response = await axios.get('https://newsapi.org/v2/everything', {
    //   params: { q: query, sources: sources.join(','), apiKey: config.news.apiKey }
    // });
    const filteredNews = mockNewsData.filter((n) => sources.includes(n.source as never)).slice(0, limit);

    const sentimentCounts = filteredNews.reduce(
      (acc, n) => {
        acc[n.sentiment]++;
        return acc;
      },
      { bullish: 0, bearish: 0, neutral: 0 },
    );

    const overallSentiment =
      sentimentCounts.bullish > sentimentCounts.bearish
        ? "bullish"
        : sentimentCounts.bearish > sentimentCounts.bullish
          ? "bearish"
          : "neutral";

    return {
      articles: filteredNews.map((n) => ({
        title: n.title,
        source: n.source,
        sentiment: n.sentiment,
        impact: n.impact,
        summary: n.summary,
        publishedAt: n.publishedAt.toISOString(),
        hoursAgo: Math.round((Date.now() - n.publishedAt.getTime()) / (1000 * 60 * 60)),
      })),
      analysis: {
        overallSentiment,
        bullishCount: sentimentCounts.bullish,
        bearishCount: sentimentCounts.bearish,
        neutralCount: sentimentCounts.neutral,
        highImpactCount: filteredNews.filter((n) => n.impact === "high").length,
        sentimentScore:
          ((sentimentCounts.bullish - sentimentCounts.bearish) / Math.max(filteredNews.length, 1)) * 100,
      },
    };
  },
});
