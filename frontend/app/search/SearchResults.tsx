'use client';


import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';


function formatNumber(num?: number, digits = 2) {
  if (num === undefined || num === null) return 'N/A';
  return num.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatMarketCap(cap?: number): string {
  if (!cap) return 'N/A';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap}`;
}

function formatVolume(vol?: number): string {
  if (!vol) return 'N/A';
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toString();
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    const fetchStockData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch quote data from local API proxy
        const response = await fetch(`/api/stock-quote?symbol=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error('Stock not found');
        }

        const data = await response.json();
        
        if (data.chart.error) {
          throw new Error(data.chart.error.description || 'Stock not found');
        }


        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];
        const adjclose = result.indicators.adjclose?.[0];
        const timestamp = result.timestamp?.[0];

        // Calculate price change
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const change = currentPrice - previousClose;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;

        setStockData({
          ...meta,
          ...quote,
          adjclose: adjclose?.adjclose?.[0],
          timestamp,
          price: currentPrice,
          previousClose,
          change,
          changePercent,
        });
      } catch (err) {
        setError('Stock symbol not found. Please check the symbol and try again.');
        setStockData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [query]);

  const formatMarketCap = (cap: number): string => {
    if (!cap) return 'N/A';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap}`;
  };

  const formatVolume = (vol: number): string => {
    if (!vol) return 'N/A';
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
          {query && (
            <p className="text-gray-600 mt-2">
              Showing results for: <span className="font-semibold">{query}</span>
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading stock data...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Search className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">No Results Found</h2>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-gray-500 mt-4">
              Try searching for a valid US stock symbol like AAPL, MSFT, GOOGL, etc.
            </p>
          </div>
        )}

        {stockData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{stockData.symbol}</h2>
                <p className="text-lg text-gray-600">{stockData.longName || stockData.shortName}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <span>Exchange: <span className="font-medium text-gray-700">{stockData.fullExchangeName || stockData.exchangeName}</span></span>
                  <span>Type: <span className="font-medium text-gray-700">{stockData.instrumentType}</span></span>
                  <span>Currency: <span className="font-medium text-gray-700">{stockData.currency}</span></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900">
                  ${formatNumber(stockData.price)}
                </div>
                <div className={`flex items-center justify-end mt-1 ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stockData.change >= 0 ? (
                    <TrendingUp className="w-5 h-5 mr-1" />
                  ) : (
                    <TrendingDown className="w-5 h-5 mr-1" />
                  )}
                  <span className="font-semibold">
                    {stockData.change >= 0 ? '+' : ''}{formatNumber(stockData.change)} ({formatNumber(stockData.changePercent)}%)
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Previous Close: <span className="font-medium text-gray-700">${formatNumber(stockData.previousClose)}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Open</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.open?.[0])}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Close</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.close?.[0])}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Adj Close</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.adjclose)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Day High</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.high?.[0])}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Day Low</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.low?.[0])}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">52W High</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.fiftyTwoWeekHigh)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">52W Low</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.fiftyTwoWeekLow)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Day Range</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(stockData.regularMarketDayLow)} - {formatNumber(stockData.regularMarketDayHigh)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Volume</p>
                <p className="text-lg font-semibold text-gray-900">{formatVolume(stockData.volume?.[0] || stockData.regularMarketVolume)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Market Cap</p>
                <p className="text-lg font-semibold text-gray-900">{formatMarketCap(stockData.marketCap)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">P/E Ratio</p>
                <p className="text-lg font-semibold text-gray-900">{stockData.trailingPE ? formatNumber(stockData.trailingPE) : 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">First Trade Date</p>
                <p className="text-lg font-semibold text-gray-900">{stockData.firstTradeDate ? new Date(stockData.firstTradeDate * 1000).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Timezone</p>
                <p className="text-lg font-semibold text-gray-900">{stockData.timezone} ({stockData.exchangeTimezoneName})</p>
              </div>
            </div>

            {/* Trading Periods */}
            {stockData.currentTradingPeriod && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Trading Periods</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(stockData.currentTradingPeriod).map(([period, info]: any) => (
                    <div key={period} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 capitalize">{period} Market</p>
                      <p className="text-xs text-gray-700">{info.timezone} | {info.gmtoffset ? `GMT${info.gmtoffset/3600}` : ''}</p>
                      <p className="text-xs text-gray-700">Start: {info.start ? new Date(info.start * 1000).toLocaleTimeString() : 'N/A'}</p>
                      <p className="text-xs text-gray-700">End: {info.end ? new Date(info.end * 1000).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Data provided for educational purposes only. Not financial advice. 
                Always consult with a qualified financial advisor before making investment decisions.
              </p>
            </div>
          </div>
        )}

        {!query && !loading && !error && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Enter a stock symbol to search</h2>
            <p className="text-gray-500 mt-2">Try symbols like AAPL, MSFT, GOOGL, TSLA, etc.</p>
          </div>
        )}
      </main>
    </div>
  );
}
