import { NextRequest, NextResponse } from 'next/server';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/csv,text/plain,application/json,*/*',
  Referer: 'https://stooq.com/',
};

function toStooqSymbol(symbol: string): string {
  const s = symbol.trim().toLowerCase();
  if (s.startsWith('^')) return s;
  return `${s}.us`;
}

function buildChartFromStooq(symbol: string, open: number, close: number) {
  const change = close - open;
  const changePercent = open ? (change / open) * 100 : 0;
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: symbol.toUpperCase(),
            regularMarketPrice: close,
            previousClose: open,
            chartPreviousClose: open,
          },
          indicators: {
            quote: [{ open: [open], close: [close], high: [close], low: [open] }],
          },
          timestamp: [Math.floor(Date.now() / 1000)],
        },
      ],
    },
    _derived: { change, changePercent },
  };
}

async function fetchFromStooq(symbol: string) {
  const stooqSymbol = toStooqSymbol(symbol);
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url, { headers: FETCH_HEADERS, cache: 'no-store' });
  if (!res.ok) return null;

  const lines = (await res.text()).trim().split('\n');
  if (lines.length < 2) return null;

  const cols = lines[1].split(',');
  if (cols.length < 7 || cols[1] === 'N/D') return null;

  const open = parseFloat(cols[3]);
  const close = parseFloat(cols[6]);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return null;

  return buildChartFromStooq(symbol, open, close);
}

async function fetchFromYahoo(symbol: string) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    { headers: FETCH_HEADERS, cache: 'no-store' },
  );
  if (!response.ok) return null;
  const data = await response.json();
  if (data?.chart?.error) return null;
  return data;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const stooqData = await fetchFromStooq(symbol);
    if (stooqData) return NextResponse.json(stooqData);

    const yahooData = await fetchFromYahoo(symbol);
    if (yahooData) return NextResponse.json(yahooData);

    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
