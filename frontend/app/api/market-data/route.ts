import { NextResponse } from 'next/server';

const CACHE_TTL_MS = 60_000;

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/csv,text/plain,*/*',
  Referer: 'https://stooq.com/',
};

const INDICES = [
  { key: 'sp500', stooq: '^spx' },
  { key: 'dow', stooq: '^dji' },
  { key: 'nasdaq', stooq: '^ndx' },
  { key: 'vix', stooq: '^vix' },
] as const;

const SECTOR_ETFS = [
  { symbol: 'xlk.us', name: 'Technology' },
  { symbol: 'xlv.us', name: 'Healthcare' },
  { symbol: 'xlf.us', name: 'Financials' },
  { symbol: 'xle.us', name: 'Energy' },
  { symbol: 'xly.us', name: 'Consumer Discretionary' },
];

const SCREENER_STOCKS = [
  { stooq: 'aapl.us', symbol: 'AAPL', name: 'Apple Inc' },
  { stooq: 'msft.us', symbol: 'MSFT', name: 'Microsoft Corp' },
  { stooq: 'googl.us', symbol: 'GOOGL', name: 'Alphabet Inc' },
  { stooq: 'amzn.us', symbol: 'AMZN', name: 'Amazon.com Inc' },
  { stooq: 'nvda.us', symbol: 'NVDA', name: 'NVIDIA Corp' },
  { stooq: 'meta.us', symbol: 'META', name: 'Meta Platforms' },
  { stooq: 'tsla.us', symbol: 'TSLA', name: 'Tesla Inc' },
  { stooq: 'amd.us', symbol: 'AMD', name: 'Advanced Micro Devices' },
  { stooq: 'nflx.us', symbol: 'NFLX', name: 'Netflix Inc' },
  { stooq: 'intc.us', symbol: 'INTC', name: 'Intel Corp' },
  { stooq: 'crm.us', symbol: 'CRM', name: 'Salesforce Inc' },
  { stooq: 'jpm.us', symbol: 'JPM', name: 'JPMorgan Chase' },
  { stooq: 'bac.us', symbol: 'BAC', name: 'Bank of America' },
  { stooq: 'dis.us', symbol: 'DIS', name: 'Walt Disney Co' },
  { stooq: 'uber.us', symbol: 'UBER', name: 'Uber Technologies' },
  { stooq: 'coin.us', symbol: 'COIN', name: 'Coinbase Global' },
  { stooq: 'pltr.us', symbol: 'PLTR', name: 'Palantir Technologies' },
] as const;

interface IndexQuote {
  value: number;
  change: number;
  percent: number;
}

interface StockMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

interface SectorRow {
  name: string;
  change: number;
  isPositive: boolean;
}

interface MarketDataResponse {
  marketSummary: Record<string, IndexQuote>;
  topGainers: StockMover[];
  topLosers: StockMover[];
  sectorPerformance: SectorRow[];
}

let cache: { data: MarketDataResponse; ts: number } | null = null;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseStooqCsv(text: string): IndexQuote | null {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  const cols = lines[1].split(',');
  if (cols.length < 7 || cols[1] === 'N/D') return null;

  const open = parseFloat(cols[3]);
  const close = parseFloat(cols[6]);
  if (!Number.isFinite(open) || !Number.isFinite(close) || open === 0) return null;

  const change = close - open;
  const percent = (change / open) * 100;

  return {
    value: round2(close),
    change: round2(change),
    percent: round2(percent),
  };
}

async function fetchStooqQuote(stooqSymbol: string, retries = 3): Promise<IndexQuote | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await delay(250 * attempt);
    try {
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
      const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' });
      if (!res.ok) continue;
      const quote = parseStooqCsv(await res.text());
      if (quote) return quote;
    } catch {
      // retry on transient failures
    }
  }
  return null;
}

async function mapInBatches<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R | null>,
  batchSize = 4,
  pauseMs = 120,
): Promise<(R | null)[]> {
  const results: (R | null)[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...(await Promise.all(batch.map(fn))));
    if (i + batchSize < items.length) await delay(pauseMs);
  }
  return results;
}

async function buildMarketData(): Promise<MarketDataResponse> {
  const indexQuotes = await mapInBatches(
    INDICES,
    (idx) => fetchStooqQuote(idx.stooq),
    2,
    80,
  );

  const marketSummary: Record<string, IndexQuote> = {};
  INDICES.forEach((idx, i) => {
    const quote = indexQuotes[i];
    if (quote) marketSummary[idx.key] = quote;
  });

  const [sectorQuotes, stockQuotes] = await Promise.all([
    mapInBatches(SECTOR_ETFS, (s) => fetchStooqQuote(s.symbol), 3, 100),
    mapInBatches(
      SCREENER_STOCKS,
      async (stock) => {
        const quote = await fetchStooqQuote(stock.stooq);
        if (!quote) return null;
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: quote.value,
          change: quote.percent,
        };
      },
      4,
      120,
    ),
  ]);

  const sectorPerformance: SectorRow[] = SECTOR_ETFS.map((sector, i) => {
    const quote = sectorQuotes[i];
    if (!quote) return null;
    return {
      name: sector.name,
      change: round2(Math.abs(quote.percent)),
      isPositive: quote.percent >= 0,
    };
  }).filter(isNonNull);

  const validStocks = stockQuotes.filter(isNonNull);
  const sorted = [...validStocks].sort((a, b) => b.change - a.change);

  return {
    marketSummary,
    topGainers: sorted.filter((s) => s.change > 0).slice(0, 3),
    topLosers: sorted.filter((s) => s.change < 0).slice(-3).reverse(),
    sectorPerformance,
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, max-age=60' },
      });
    }

    const data = await buildMarketData();
    cache = { data, ts: Date.now() };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, max-age=60' },
      });
    }
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
