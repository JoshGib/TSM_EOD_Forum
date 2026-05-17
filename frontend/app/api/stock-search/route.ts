import { NextRequest, NextResponse } from 'next/server';

function mapQuoteResultToSearchQuote(item: any) {
  return {
    symbol: item.symbol,
    shortname: item.shortName || item.longName || item.displayName || item.symbol,
    longname: item.longName || item.shortName || item.displayName || item.symbol,
    exchange: item.fullExchangeName || item.exchange || '',
    quoteType: item.quoteType || 'EQUITY',
  };
}

const STOOQ_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  Accept: 'text/csv,text/plain,application/json,*/*',
  Referer: 'https://stooq.com/',
};

function toStooqSymbol(symbol: string): string {
  const s = symbol.trim().toLowerCase();
  if (s.startsWith('^')) return s;
  return `${s}.us`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const urls = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableCaas=false&apiVersion=7`,
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableCaas=false&apiVersion=7`,
    ];

    let lastError: unknown = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          lastError = new Error(`Yahoo status ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (Array.isArray(data?.quotes) && data.quotes.length > 0) {
          return NextResponse.json(data);
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Fallback: exact/near-exact ticker lookup when search endpoint returns empty.
    try {
      const quoteResp = await fetch(
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          cache: 'no-store',
        }
      );
      if (quoteResp.ok) {
        const quoteData = await quoteResp.json();
        const results = Array.isArray(quoteData?.quoteResponse?.result)
          ? quoteData.quoteResponse.result
          : [];
        const quotes = results
          .filter((item: any) => item?.symbol)
          .map(mapQuoteResultToSearchQuote);
        return NextResponse.json({ quotes });
      }
    } catch (err) {
      lastError = err;
    }

    // Final fallback: validate via Stooq and return at least one suggestion.
    try {
      const cleaned = query.trim().toUpperCase();
      if (cleaned) {
        const stooqResp = await fetch(
          `https://stooq.com/q/l/?s=${encodeURIComponent(toStooqSymbol(cleaned))}&f=sd2t2ohlcv&h&e=csv`,
          { headers: STOOQ_HEADERS, cache: 'no-store' },
        );
        if (stooqResp.ok) {
          const lines = (await stooqResp.text()).trim().split('\n');
          if (lines.length >= 2) {
            const cols = lines[1].split(',');
            // Date column is N/D when symbol is invalid.
            if (cols.length >= 2 && cols[1] !== 'N/D') {
              return NextResponse.json({
                quotes: [
                  {
                    symbol: cleaned,
                    shortname: cleaned,
                    longname: cleaned,
                    exchange: 'US',
                    quoteType: 'EQUITY',
                  },
                ],
              });
            }
          }
        }
      }
    } catch (err) {
      lastError = err;
    }

    console.error('Yahoo search upstream failed, returning empty results:', lastError);
    return NextResponse.json({ quotes: [] });
  } catch (error) {
    console.error('Error proxying to Yahoo Finance:', error);
    return NextResponse.json({ quotes: [] });
  }
}
