export interface UserProfile {
  userId: string;
  name: string;
  investmentStyle: "conservative" | "moderate" | "aggressive";
  riskProfile: "low" | "medium" | "high";
  portfolioValue: number;
  investmentGoals: string[];
  goldPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoldPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date;
}

export interface TechnicalIndicators {
  symbol: string;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  trend: "bullish" | "bearish" | "neutral";
  support: number[];
  resistance: number[];
}

export interface EconomicEvent {
  date: Date;
  event: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  impact: "high" | "medium" | "low";
  currency: string;
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment: "bullish" | "bearish" | "neutral";
  summary: string;
  impact: "high" | "medium" | "low";
}

export interface MacroData {
  fedFundsRate: number;
  cpi: number;
  ppi: number;
  nfp: number;
  usdIndex: number;
  us10YBondYield: number;
  direction: "hawkish" | "dovish" | "neutral";
}

export interface IntentResult {
  intent:
    | "market_analysis"
    | "news_query"
    | "portfolio_advice"
    | "macro_analysis"
    | "general_question"
    | "risk_assessment";
  needNews: boolean;
  needMacro: boolean;
  needTechnical: boolean;
  needPortfolio: boolean;
  needRisk: boolean;
  confidence: number;
}

export interface GoldAnalysisResult {
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  support: number[];
  resistance: number[];
  currentPrice: number;
  summary: string;
  technicalSignals: TechnicalIndicators;
}

export interface NewsAnalysisResult {
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  articles: NewsArticle[];
  summary: string;
}

export interface MacroAnalysisResult {
  macroDirection: "bullish" | "bearish" | "neutral";
  confidence: number;
  keyFactors: string[];
  summary: string;
}

export interface PortfolioAdviceResult {
  goldAllocation: number;
  cashAllocation: number;
  otherAllocation: number;
  reasoning: string;
  rebalanceNeeded: boolean;
}

export interface RiskAssessmentResult {
  riskLevel: "low" | "medium" | "high" | "very_high";
  riskReward: string;
  stopLoss: number;
  takeProfit: number;
  recommendation: string;
}

export interface ChatRequest {
  userId: string;
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  answer: string;
  confidence: number;
  agentsUsed: string[];
  sources: string[];
  memoryUsed: boolean;
  disclaimer: string;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  similarity?: number;
}
