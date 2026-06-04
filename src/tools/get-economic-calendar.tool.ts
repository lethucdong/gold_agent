import { createTool } from "@voltagent/core";
import { z } from "zod";

const mockEconomicEvents = [
  {
    event: "FOMC Meeting Minutes",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    actual: null,
    forecast: "Giữ nguyên 5.25-5.50%",
    previous: "5.25-5.50%",
    impact: "high" as const,
    currency: "USD",
    description: "Biên bản cuộc họp Ủy ban Thị trường Mở Liên bang - ảnh hưởng lớn đến USD và vàng",
  },
  {
    event: "CPI (YoY)",
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    actual: null,
    forecast: "3.2%",
    previous: "3.5%",
    impact: "high" as const,
    currency: "USD",
    description: "Chỉ số giá tiêu dùng Mỹ - thước đo lạm phát chính",
  },
  {
    event: "NFP (Non-Farm Payrolls)",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    actual: null,
    forecast: "185K",
    previous: "275K",
    impact: "high" as const,
    currency: "USD",
    description: "Báo cáo việc làm phi nông nghiệp - ảnh hưởng đến kỳ vọng FED",
  },
  {
    event: "PPI (MoM)",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    actual: "0.2%",
    forecast: "0.3%",
    previous: "0.4%",
    impact: "medium" as const,
    currency: "USD",
    description: "Chỉ số giá sản xuất - indicator lạm phát sớm",
  },
  {
    event: "US 10Y Bond Auction",
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    actual: null,
    forecast: "4.45%",
    previous: "4.35%",
    impact: "medium" as const,
    currency: "USD",
    description: "Đấu giá trái phiếu kho bạc 10 năm Mỹ",
  },
  {
    event: "USD Index (DXY)",
    date: new Date(),
    actual: "104.5",
    forecast: null,
    previous: "103.8",
    impact: "high" as const,
    currency: "USD",
    description: "Chỉ số sức mạnh đồng Dollar Mỹ - tương quan nghịch với vàng",
  },
];

export const getEconomicCalendarTool = createTool({
  name: "getEconomicCalendar",
  description:
    "Lấy lịch kinh tế sắp tới với các sự kiện quan trọng: CPI, FOMC, NFP, PPI, lãi suất, USD Index. Đây là các chỉ báo vĩ mô ảnh hưởng đến giá vàng.",
  parameters: z.object({
    daysAhead: z
      .number()
      .min(1)
      .max(30)
      .optional()
      .default(7)
      .describe("Số ngày phía trước để lấy lịch kinh tế"),
    impactFilter: z
      .enum(["all", "high", "medium"])
      .optional()
      .default("high")
      .describe("Lọc theo mức độ ảnh hưởng"),
  }),
  execute: async ({ daysAhead, impactFilter }) => {
    // TODO: Replace with real economic calendar API (e.g., Investing.com, Forex Factory, Trading Economics)
    const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    let events = mockEconomicEvents.filter((e) => e.date <= cutoff);

    if (impactFilter !== "all") {
      events = events.filter((e) =>
        impactFilter === "high" ? e.impact === "high" : e.impact === "high" || e.impact === "medium",
      );
    }

    const upcomingHighImpact = events.filter((e) => e.impact === "high" && !e.actual);

    return {
      events: events.map((e) => ({
        event: e.event,
        date: e.date.toISOString(),
        daysUntil: Math.ceil((e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        actual: e.actual,
        forecast: e.forecast,
        previous: e.previous,
        impact: e.impact,
        currency: e.currency,
        description: e.description,
        isUpcoming: !e.actual,
      })),
      summary: {
        totalEvents: events.length,
        upcomingHighImpactCount: upcomingHighImpact.length,
        nextHighImpactEvent: upcomingHighImpact[0]?.event ?? "Không có",
        marketAlertLevel: upcomingHighImpact.length >= 2 ? "high" : upcomingHighImpact.length === 1 ? "medium" : "low",
      },
    };
  },
});
