import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import yahooFinance from "yahoo-finance2";
import pool from "@/app/lib/db";
import { fetchForeignHoldingsTable, type ForeignHoldingRow } from "../n_finance/route";
import { fetchNaverNewsArticles, type NaverArticle } from "../n_news/route";

loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL_NAME ?? "gpt-4.1-mini";

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const MIN_API_GAP_MS = 1_000;
let throttleChain = Promise.resolve();
let lastCall = 0;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttle() {
  throttleChain = throttleChain
    .catch(() => undefined)
    .then(async () => {
      const now = Date.now();
      const wait = Math.max(0, MIN_API_GAP_MS - (now - lastCall));
      if (wait > 0) {
        await delay(wait);
      }
      lastCall = Date.now();
    });
  return throttleChain;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, pauseMs = 1_500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      await throttle();
      return await fn();
    } catch (error) {
      attempt += 1;
      const message = (error as Error).message ?? "";
      if (attempt > retries || !message.includes("Too Many Requests")) {
        throw error;
      }
      await delay(pauseMs);
    }
  }
}

interface PriceBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

const priceCache = new Map<string, { fetchedAt: number; data: PriceBar[] }>();
const PRICE_CACHE_TTL = 5 * 60 * 1_000;

function resolvePeriodStart(months: number) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(now.getMonth() - months);
  return start;
}

async function getPriceHistory(symbol: string, months = 3, interval: "1d" | "1wk" | "1mo" = "1d"): Promise<PriceBar[]> {
  const cacheKey = `${symbol}:${months}:${interval}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL) {
    return cached.data;
  }

  const period1 = resolvePeriodStart(months);
  const chart = await withRetry(() =>
    yahooFinance.chart(symbol, {
      period1,
      interval,
    })
  );

  const quotes = chart?.quotes ?? [];
  const normalized: PriceBar[] = quotes.map((quote) => ({
    date: quote.date ? new Date(quote.date).toISOString().split("T")[0] : "",
    open: quote.open ?? null,
    high: quote.high ?? null,
    low: quote.low ?? null,
    close: quote.close ?? null,
    volume: quote.volume ?? null,
  }));

  priceCache.set(cacheKey, { fetchedAt: Date.now(), data: normalized });
  return normalized;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object" && "raw" in value) {
    const raw = (value as Record<string, unknown>).raw;
    if (typeof raw === "number") {
      return Number.isFinite(raw) ? raw : null;
    }
  }
  return null;
}

function calculateRsi(closes: number[], length = 14): number | null {
  if (closes.length <= length) {
    return null;
  }

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) {
      gainSum += delta;
    } else {
      lossSum += Math.abs(delta);
    }
  }

  let avgGain = gainSum / length;
  let avgLoss = lossSum / length;

  for (let i = length + 1; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    const gain = Math.max(0, delta);
    const loss = Math.max(0, -delta);

    avgGain = (avgGain * (length - 1) + gain) / length;
    avgLoss = (avgLoss * (length - 1) + loss) / length;
  }

  if (avgLoss === 0) {
    return 100;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function exponentialMovingAverage(values: number[], period: number): number[] {
  const alpha = 2 / (period + 1);
  const ema: number[] = [];

  let prevEma = values[0];
  ema.push(prevEma);

  for (let i = 1; i < values.length; i += 1) {
    const next = values[i] * alpha + prevEma * (1 - alpha);
    ema.push(next);
    prevEma = next;
  }

  return ema;
}

function calculateMacd(closes: number[], fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) {
    return null;
  }

  const emaFast = exponentialMovingAverage(closes, fast);
  const emaSlow = exponentialMovingAverage(closes, slow);
  const macdLine = emaFast.map((value, idx) => value - emaSlow[idx]);
  const signalLine = exponentialMovingAverage(macdLine, signal);
  const hist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];

  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    hist,
  };
}

function calculateBollingerBands(closes: number[], period = 20, multiplier = 2) {
  if (closes.length < period) {
    return null;
  }

  const slice = closes.slice(-period);
  const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
  const variance = slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / slice.length;
  const stddev = Math.sqrt(variance);

  return {
    upper: mean + multiplier * stddev,
    middle: mean,
    lower: mean - multiplier * stddev,
  };
}

function computeSupportResistance(closes: number[]) {
  if (closes.length < 10) {
    return { support: [], resistance: [] };
  }

  const recent = closes.slice(-60);
  const sorted = [...recent].sort((a, b) => a - b);
  const pick = (percentile: number) => {
    const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * percentile)));
    return sorted[index];
  };

  const support = Array.from(new Set([pick(0.1), pick(0.25)])).filter((value) => Number.isFinite(value));
  const resistance = Array.from(new Set([pick(0.75), pick(0.9)])).filter((value) => Number.isFinite(value));

  return { support, resistance };
}

function determineTrend(closes: number[]) {
  if (closes.length < 5) {
    return "sideways";
  }

  const window = closes.slice(-30);
  if (window.length < 2) {
    return "sideways";
  }

  const start = window[0];
  const end = window[window.length - 1];
  if (!start || !end) {
    return "sideways";
  }

  const change = ((end - start) / Math.abs(start)) * 100;
  if (change > 5) {
    return "up";
  }
  if (change < -5) {
    return "down";
  }
  return "sideways";
}

async function fetchGlobalNews(ticker: string) {
  const searchResult = await withRetry(() =>
    yahooFinance.search(ticker, {
      newsCount: 6,
      quotesCount: 0,
    })
  );

  return searchResult.news ?? [];
}

async function fetchFinancialSnapshot(symbol: string) {
  return withRetry(() =>
    yahooFinance.quoteSummary(symbol, {
      modules: [
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
        "balanceSheetHistory",
        "balanceSheetHistoryQuarterly",
        "cashflowStatementHistory",
        "cashflowStatementHistoryQuarterly",
        "financialData",
        "insiderTransactions",
      ],
    })
  );
}

interface ResearchContext {
  symbol: string;
  isKorean: boolean;
  globalNews: unknown[];
  naverNews: NaverArticle[];
  ownership: ForeignHoldingRow[];
  ownershipSummary: {
    institutionalNet: number | null;
    institutionalNetDelta: number | null;
    foreignOwnership: number | null;
    foreignOwnershipDelta: number | null;
  } | null;
}

interface TechnicalContext {
  priceHistory: PriceBar[];
  closes: number[];
  rsi: number | null;
  macd: ReturnType<typeof calculateMacd>;
  bollinger: ReturnType<typeof calculateBollingerBands>;
  supportLevels: number[];
  resistanceLevels: number[];
  trend: string;
}

interface FinancialContext {
  incomeStatement: unknown;
  balanceSheet: unknown;
  cashflow: unknown;
  insiderTransactions: unknown;
  metrics: Record<string, number | null>;
}

async function buildResearchContext(symbol: string, isKorean: boolean): Promise<ResearchContext> {
  const [globalNews, naverNews, ownership] = await Promise.all([
    isKorean ? Promise.resolve([]) : fetchGlobalNews(symbol),
    isKorean ? fetchNaverNewsArticles(symbol) : Promise.resolve([]),
    isKorean ? fetchForeignHoldingsTable(symbol) : Promise.resolve([]),
  ]);

  const latest = ownership[0];
  const previous = ownership[1];
  const ownershipSummary = latest
    ? {
        institutionalNet: latest.institutionalNet ?? null,
        institutionalNetDelta:
          latest.institutionalNet !== null && typeof previous?.institutionalNet === "number"
            ? latest.institutionalNet - previous.institutionalNet
            : null,
        foreignOwnership: latest.foreignOwnership ?? null,
        foreignOwnershipDelta:
          latest.foreignOwnership !== null && typeof previous?.foreignOwnership === "number"
            ? latest.foreignOwnership - previous.foreignOwnership
            : null,
      }
    : null;

  return {
    symbol,
    isKorean,
    globalNews,
    naverNews,
    ownership,
    ownershipSummary,
  };
}

async function buildTechnicalContext(symbol: string): Promise<TechnicalContext> {
  const priceHistory = await getPriceHistory(symbol);
  const closes = priceHistory.map((bar) => (bar.close ?? undefined)).filter((value): value is number => value !== undefined);

  const rsi = calculateRsi(closes) ?? 50;
  const macd = calculateMacd(closes) ?? { macd: 0, signal: 0, hist: 0 };
  const bollinger = calculateBollingerBands(closes);
  const { support, resistance } = computeSupportResistance(closes);
  const trend = determineTrend(closes);

  return {
    priceHistory,
    closes,
    rsi,
    macd,
    bollinger,
    supportLevels: support,
    resistanceLevels: resistance,
    trend,
  };
}

function computeYoY(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (filtered.length < 2) {
    return null;
  }

  const latest = filtered[0];
  const previous = filtered[1];
  if (!previous || previous === 0) {
    return null;
  }

  return ((latest - previous) / Math.abs(previous)) * 100;
}

function pickNumbers(entries: unknown[], key: string): Array<number | null> {
  return entries.map((item) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const value = (item as Record<string, unknown>)[key];
    return toNumber(value);
  });
}

async function buildFinancialContext(symbol: string): Promise<FinancialContext> {
  const summary = await fetchFinancialSnapshot(symbol);

  const incomeStatementHistory =
    summary?.incomeStatementHistory?.incomeStatementHistory ?? [];
  const balanceSheetHistory =
    summary?.balanceSheetHistory?.balanceSheetStatements ?? [];
  const cashflowHistory =
    summary?.cashflowStatementHistory?.cashflowStatements ?? [];
  const insiderTransactions = summary?.insiderTransactions?.transactions ?? [];

  const revenueYoY = computeYoY(pickNumbers(incomeStatementHistory, "totalRevenue"));
  const epsYoY = computeYoY(pickNumbers(incomeStatementHistory, "dilutedEPS"));

  const roe = toNumber(summary?.financialData?.returnOnEquity);
  const debtToEquity = toNumber(summary?.financialData?.debtToEquity);
  const cashFlow = toNumber(summary?.financialData?.operatingCashflow) ?? toNumber(summary?.financialData?.freeCashflow);

  return {
    incomeStatement: incomeStatementHistory,
    balanceSheet: balanceSheetHistory,
    cashflow: cashflowHistory,
    insiderTransactions,
    metrics: {
      revenue_yoy: revenueYoY,
      eps_yoy: epsYoY,
      roe: roe ?? null,
      debt_to_equity: debtToEquity ?? null,
      cash_flow: cashFlow ?? null,
    },
  };
}

const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["symbol", "sentiment", "ownership"],
  properties: {
    symbol: { type: "string" },
    sentiment: {
      type: "object",
      additionalProperties: false,
      required: ["score", "top_headlines"],
      properties: {
        score: { type: ["number", "null"], minimum: -1, maximum: 1 },
        top_headlines: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "link", "sentiment"],
            properties: {
              title: { type: "string" },
              link: { type: "string" },
              sentiment: { type: "string", enum: ["pos", "neg", "neu"] },
            },
          },
        },
      },
    },
    ownership: {
      type: "object",
      additionalProperties: false,
      required: ["institutional", "foreign"],
      properties: {
        institutional: {
          type: "object",
          additionalProperties: false,
          required: ["current_pct", "delta_1d"],
          properties: {
            current_pct: { type: ["number", "null"] },
            delta_1d: { type: ["number", "null"] },
          },
        },
        foreign: {
          type: "object",
          additionalProperties: false,
          required: ["current_pct", "delta_1d"],
          properties: {
            current_pct: { type: ["number", "null"] },
            delta_1d: { type: ["number", "null"] },
          },
        },
      },
    },
  },
};

const TECH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["symbol", "rsi", "macd", "support_levels", "resistance_levels", "trend"],
  properties: {
    symbol: { type: "string" },
    rsi: { type: ["number", "null"] },
    macd: {
      type: "object",
      additionalProperties: false,
      required: ["hist", "signal", "macd"],
      properties: {
        hist: { type: ["number", "null"] },
        signal: { type: ["number", "null"] },
        macd: { type: ["number", "null"] },
      },
    },
    support_levels: {
      type: "array",
      items: { type: "number" },
    },
    resistance_levels: {
      type: "array",
      items: { type: "number" },
    },
    trend: { type: "string", enum: ["up", "down", "sideways"] },
  },
};

const FIN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["symbol", "revenue_yoy", "eps_yoy", "roe", "debt_to_equity", "cash_flow"],
  properties: {
    symbol: { type: "string" },
    revenue_yoy: { type: ["number", "null"] },
    eps_yoy: { type: ["number", "null"] },
    roe: { type: ["number", "null"] },
    debt_to_equity: { type: ["number", "null"] },
    cash_flow: { type: ["number", "null"] },
  },
};

const RECOMMEND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["symbol", "recommendation", "report", "score"],
  properties: {
    symbol: { type: "string" },
    recommendation: { type: "string", enum: ["BUY", "SELL", "HOLD"] },
    report: { type: "string" },
    score: { type: "number", minimum: 0, maximum: 100 },
  },
};

interface ResponseSchemaDefinition {
  name: string;
  schema: Record<string, unknown>;
}

function extractResponseText(response: any): string {
  if (typeof response?.output_text === "string") {
    return response.output_text;
  }

  const output = response?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (Array.isArray(item?.content)) {
        for (const block of item.content) {
          if (block?.type === "output_text" && typeof block?.text === "string") {
            return block.text;
          }
        }
      }
    }
  }

  throw new Error("Unable to extract text from OpenAI response.");
}

interface AgentTaskOptions {
  schema: ResponseSchemaDefinition;
  systemPrompt: string;
  company: string;
  context: unknown;
}

async function runStructuredAgent(options: AgentTaskOptions) {
  const { schema, systemPrompt, company, context } = options;

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemPrompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `회사 식별자: ${company}`,
              "아래는 참고용 데이터(JSON)입니다.",
              JSON.stringify(context, null, 2),
            ].join("\n\n"),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schema.name,
        schema: schema.schema,
        strict: true,
      },
    },
  });

  const text = extractResponseText(response);
  return JSON.parse(text);
}

const RESEARCH_PROMPT = `
당신은 금융 리서치 분석가입니다.
제공된 뉴스, 공시, 보유 비중 데이터를 분석하여 종목의 정성적/정량적 심리를 평가하세요.
- \`sentiment.score\`는 -1에서 1 사이 실수입니다.
- \`sentiment.top_headlines\`에는 핵심 기사 3~5개의 제목과 링크, 감성을 넣으세요.
- \`ownership\` 필드는 표에서 파생한 최근 수치를 기반으로 작성하세요.
- 답변은 반드시 JSON 스키마를 따르고, 불필요한 텍스트를 포함하지 마세요.
`.trim();

const TECH_PROMPT = `
당신은 기술적 분석가입니다.
가격 데이터, RSI, MACD, 볼린저 밴드, 지지/저항, 추세 정보를 활용하여 정량 지표를 요약하세요.
- \`rsi\`, \`macd\`, \`support_levels\`, \`resistance_levels\`, \`trend\` 값은 제공된 데이터를 그대로 활용하세요.
- 존재하지 않는 값은 추정하지 말고 가장 근접한 수치를 사용하세요.
- 답변은 JSON 스키마를 반드시 준수하세요.
`.trim();

const FIN_PROMPT = `
당신은 재무제표 분석 전문가입니다.
수익성, 성장성, 재무 건전성을 보여주는 주요 지표를 계산해 스키마에 맞게 채우세요.
- \`revenue_yoy\`, \`eps_yoy\`는 최근 연간 데이터 기준 전년 대비 성장률(%)입니다.
- \`roe\`, \`debt_to_equity\`, \`cash_flow\`는 제공된 데이터를 사용하세요.
- 값이 없으면 가장 최근 또는 합리적인 대안을 사용하고, 없는 경우 0을 넣지 말고 0에 가까운 실제 값을 사용하세요.
- 반드시 JSON 스키마를 따르세요.
`.trim();

const RECO_PROMPT = `
당신은 헤지펀드 매니저입니다.
리서치, 기술, 재무 보고서를 종합하여 투자 의견을 결정하세요.
- \`recommendation\`은 BUY, SELL, HOLD 중 하나입니다.
- \`report\`는 한국어로 작성된 간결한 서술형 리포트입니다.
- \`score\`는 0~100 사이 숫자로 확신도를 의미합니다.
- 보고서에는 세부 근거를 2~3가지 포함하세요.
`.trim();

async function saveRecommendation(result: { symbol: string; recommendation: string; score: number; report: string }) {
  await pool.query(
    `
      INSERT INTO stock_recommendation (symbol, recommendation, score, report)
      VALUES ($1, $2, $3, $4)
    `,
    [result.symbol, result.recommendation, result.score, result.report]
  );
}

function isKoreanSymbol(symbol: string) {
  return /\d{6}/.test(symbol) || /\.K[QS]$/i.test(symbol);
}

export async function runAnalysis(symbol: string) {
  const korean = isKoreanSymbol(symbol);

  const [researchContext, technicalContext, financialContext] = await Promise.all([
    buildResearchContext(symbol, korean),
    buildTechnicalContext(symbol),
    buildFinancialContext(symbol),
  ]);

  const research = await runStructuredAgent({
    schema: { name: "ResearchSchema", schema: RESEARCH_SCHEMA },
    systemPrompt: RESEARCH_PROMPT,
    company: symbol,
    context: researchContext,
  });

  const technical = await runStructuredAgent({
    schema: { name: "TechnicalSchema", schema: TECH_SCHEMA },
    systemPrompt: TECH_PROMPT,
    company: symbol,
    context: technicalContext,
  });

  const financial = await runStructuredAgent({
    schema: { name: "FinancialSchema", schema: FIN_SCHEMA },
    systemPrompt: FIN_PROMPT,
    company: symbol,
    context: financialContext,
  });

  const recommendation = await runStructuredAgent({
    schema: { name: "RecommendationSchema", schema: RECOMMEND_SCHEMA },
    systemPrompt: RECO_PROMPT,
    company: symbol,
    context: { research, technical, financial },
  });

  const normalizedRecommendation = {
    symbol: recommendation.symbol ?? symbol,
    recommendation:
      typeof recommendation.recommendation === "string"
        ? recommendation.recommendation.toUpperCase()
        : "HOLD",
    report: typeof recommendation.report === "string" ? recommendation.report : "",
    score:
      typeof recommendation.score === "number"
        ? recommendation.score
        : Number(recommendation.score ?? 0) || 0,
  };

  await saveRecommendation(normalizedRecommendation);
  return { research, technical, financial, recommendation: normalizedRecommendation };
}

async function main() {
  const symbol = process.argv[2];
  if (!symbol) {
    console.error("No symbol provided. Usage: pnpm ts-node src/app/api/rec_generate/rec_generate.ts <SYMBOL>");
    process.exit(1);
  }

  try {
    const result = await runAnalysis(symbol);
    console.log(`Analysis completed for ${symbol}. Recommendation saved.`);
    console.log(JSON.stringify(result.recommendation, null, 2));
  } catch (error) {
    console.error(`[ERR] Failed to run analysis for ${symbol}:`, error);
    process.exit(1);
  }
}

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  main();
}

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
    }

    const result = await runAnalysis(symbol);
    return Response.json({ message: "추천 데이터 생성 완료", data: result.recommendation });
  } catch (error) {
    console.error("[rec_generate] Failed to generate recommendation:", error);
    return Response.json({ error: "추천 데이터 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
