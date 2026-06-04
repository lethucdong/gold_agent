import { createTool } from "@voltagent/core";
import { z } from "zod";

export const getFearGreedTool = createTool({
  name: "getFearGreedIndex",
  description:
    "Lấy chỉ số Fear & Greed (Sợ hãi & Tham lam) của thị trường vàng và tài chính. Chỉ số 0-25: Sợ hãi cực độ, 26-50: Sợ hãi, 51-75: Tham lam, 76-100: Tham lam cực độ.",
  parameters: z.object({
    market: z
      .enum(["gold", "crypto", "stocks", "all"])
      .optional()
      .default("gold")
      .describe("Thị trường cần đánh giá tâm lý"),
  }),
  execute: async ({ market }) => {
    // TODO: Replace with real Fear & Greed API (e.g., CNN Money, alternative.me)
    // const response = await axios.get('https://api.alternative.me/fng/');
    const goldIndex = Math.floor(Math.random() * 30) + 45; // Mock: 45-75
    const stockIndex = Math.floor(Math.random() * 40) + 40;
    const cryptoIndex = Math.floor(Math.random() * 50) + 30;

    const getLabel = (index: number) => {
      if (index <= 25) return "Sợ hãi cực độ";
      if (index <= 50) return "Sợ hãi";
      if (index <= 75) return "Tham lam";
      return "Tham lam cực độ";
    };

    const getSignal = (index: number) => {
      if (index <= 25) return "Cơ hội mua mạnh (thị trường quá sợ hãi)";
      if (index <= 40) return "Cơ hội mua (thị trường thận trọng)";
      if (index <= 60) return "Trung tính - chờ tín hiệu rõ hơn";
      if (index <= 75) return "Thận trọng khi mua thêm (thị trường tham lam)";
      return "Cảnh báo bán (thị trường tham lam cực độ)";
    };

    const indexes = {
      gold: goldIndex,
      stocks: stockIndex,
      crypto: cryptoIndex,
    };

    const selectedIndex = market === "all" ? Math.round((goldIndex + stockIndex) / 2) : (indexes[market] ?? goldIndex);

    return {
      market,
      index: selectedIndex,
      label: getLabel(selectedIndex),
      signal: getSignal(selectedIndex),
      components: {
        gold: { value: goldIndex, label: getLabel(goldIndex) },
        stocks: { value: stockIndex, label: getLabel(stockIndex) },
        crypto: { value: cryptoIndex, label: getLabel(cryptoIndex) },
      },
      interpretation: {
        contrarian:
          selectedIndex <= 40
            ? "Thị trường sợ hãi - đây có thể là cơ hội mua vào cho nhà đầu tư dài hạn"
            : "Thị trường lạc quan - nhà đầu tư thông minh thường thận trọng hơn ở thời điểm này",
        correlation: "Khi chỉ số sợ hãi cao, vàng thường nhận được dòng vốn trú ẩn an toàn",
      },
      timestamp: new Date().toISOString(),
    };
  },
});
