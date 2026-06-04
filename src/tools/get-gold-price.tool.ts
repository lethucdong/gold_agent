import { createTool } from "@voltagent/core";
import { z } from "zod";
import type { GoldPrice } from "../domain/types.js";

function generateMockGoldPrice(symbol: string): GoldPrice {
  const basePrice =
    symbol === "XAUUSD"
      ? 2350
      : symbol === "SJC"
        ? 88500000
        : symbol === "PNJ"
          ? 87800000
          : 2350;

  const variation = (Math.random() - 0.5) * 0.02;
  const price = basePrice * (1 + variation);
  const change = price - basePrice;
  const changePercent = (change / basePrice) * 100;

  return {
    symbol,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    high: price * 1.005,
    low: price * 0.995,
    volume: Math.floor(Math.random() * 100000) + 50000,
    timestamp: new Date(),
  };
}

export const getGoldPriceTool = createTool({
  name: "getGoldPrice",
  description:
    "Lấy giá vàng hiện tại cho một ký hiệu cụ thể (XAUUSD, SJC, PNJ). Trả về giá, thay đổi và phần trăm thay đổi.",
  parameters: z.object({
    symbol: z
      .enum(["XAUUSD", "SJC", "PNJ"])
      .describe("Ký hiệu vàng: XAUUSD (giá thế giới USD/oz), SJC (vàng miếng SJC VND/lượng), PNJ (vàng PNJ VND/lượng)"),
  }),
  execute: async ({ symbol }) => {
    // TODO: Replace with real market data API (e.g., Goldapi.io, MetalpriceAPI)
    // const response = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
    //   headers: { 'x-access-token': config.marketData.apiKey }
    // });
    const data = generateMockGoldPrice(symbol);

    return {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      high: data.high,
      low: data.low,
      volume: data.volume,
      timestamp: data.timestamp.toISOString(),
      currency: symbol === "XAUUSD" ? "USD" : "VND",
      unit: symbol === "XAUUSD" ? "troy oz" : "lượng",
    };
  },
});
