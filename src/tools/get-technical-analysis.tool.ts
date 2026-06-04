import { createTool } from "@voltagent/core";
import { z } from "zod";

function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[prices.length - i] - prices[prices.length - i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function generatePriceSeries(basePrice: number, length: number): number[] {
  const prices = [basePrice];
  for (let i = 1; i < length; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.005;
    prices.push(prices[i - 1] + change);
  }
  return prices;
}

export const getTechnicalAnalysisTool = createTool({
  name: "getTechnicalAnalysis",
  description:
    "Phân tích kỹ thuật giá vàng: SMA20, SMA50, SMA200, RSI, MACD, Bollinger Bands. Xác định xu hướng, vùng hỗ trợ và kháng cự.",
  parameters: z.object({
    symbol: z
      .enum(["XAUUSD", "SJC", "PNJ"])
      .describe("Ký hiệu để phân tích kỹ thuật"),
    period: z
      .enum(["1d", "1w", "1m"])
      .optional()
      .default("1d")
      .describe("Khung thời gian phân tích"),
  }),
  execute: async ({ symbol, period }) => {
    // TODO: Connect to real OHLCV data provider (e.g., Alpha Vantage, Yahoo Finance, TradingView)
    const basePrice = symbol === "XAUUSD" ? 2350 : symbol === "SJC" ? 88500000 : 87800000;
    const prices = generatePriceSeries(basePrice, 250);
    const currentPrice = prices[prices.length - 1];

    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const rsi = calculateRSI(prices);

    const ema12 = calculateSMA(prices.slice(-12), 12);
    const ema26 = calculateSMA(prices.slice(-26), 26);
    const macdValue = ema12 - ema26;
    const macdSignal = macdValue * 0.9;
    const macdHistogram = macdValue - macdSignal;

    const stdDev = Math.sqrt(
      prices
        .slice(-20)
        .map((p) => Math.pow(p - sma20, 2))
        .reduce((a, b) => a + b, 0) / 20,
    );
    const bbUpper = sma20 + 2 * stdDev;
    const bbLower = sma20 - 2 * stdDev;

    const bullishSignals =
      (currentPrice > sma200 ? 1 : 0) +
      (currentPrice > sma50 ? 1 : 0) +
      (currentPrice > sma20 ? 1 : 0) +
      (rsi > 50 && rsi < 70 ? 1 : 0) +
      (macdHistogram > 0 ? 1 : 0);

    const trend = bullishSignals >= 4 ? "bullish" : bullishSignals <= 2 ? "bearish" : "neutral";

    const support = [
      Math.round(sma200 * 100) / 100,
      Math.round(sma50 * 100) / 100,
      Math.round(bbLower * 100) / 100,
    ].sort((a, b) => b - a);

    const resistance = [
      Math.round(sma20 * 100) / 100,
      Math.round(bbUpper * 100) / 100,
      Math.round(currentPrice * 1.02 * 100) / 100,
    ].sort((a, b) => a - b);

    return {
      symbol,
      period,
      currentPrice: Math.round(currentPrice * 100) / 100,
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
      rsi: Math.round(rsi * 100) / 100,
      rsiSignal: rsi > 70 ? "Quá mua" : rsi < 30 ? "Quá bán" : "Bình thường",
      macd: {
        macd: Math.round(macdValue * 100) / 100,
        signal: Math.round(macdSignal * 100) / 100,
        histogram: Math.round(macdHistogram * 100) / 100,
        crossSignal: macdHistogram > 0 ? "Mua" : "Bán",
      },
      bollingerBands: {
        upper: Math.round(bbUpper * 100) / 100,
        middle: Math.round(sma20 * 100) / 100,
        lower: Math.round(bbLower * 100) / 100,
        bandwidth: Math.round(((bbUpper - bbLower) / sma20) * 10000) / 100,
      },
      trend,
      trendStrength: `${bullishSignals}/5 tín hiệu tăng`,
      support,
      resistance,
      priceVsSma200: `${((currentPrice / sma200 - 1) * 100).toFixed(2)}%`,
    };
  },
});
