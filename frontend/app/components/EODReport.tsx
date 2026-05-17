'use client';

import type { LucideIcon } from 'lucide-react';
import { BarChart3, Calendar, MessageSquare, Newspaper, TrendingDown, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const ML_URL = process.env.NEXT_PUBLIC_ML_URL ?? 'https://tsmforumfeed-yeww6.ondigitalocean.app/group-3---main-ml';

interface SectorPerformance {
  id: number;
  sector_name: string;
  performance_percentage: string;
  is_positive: boolean;
}

interface FinancialSummary {
  id: number;
  report_date: string;
  summary_text: string;
  market_tone: string;
  source_urls: string | null;
  created_at: string;
  sectors: SectorPerformance[];
}

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

interface MarketData {
  marketSummary: {
    sp500?: IndexQuote;
    dow?: IndexQuote;
    nasdaq?: IndexQuote;
  };
  topGainers: StockMover[];
  topLosers: StockMover[];
  sectorPerformance: SectorRow[];
}

const INDEX_CARDS = [
  { key: 'sp500' as const, label: 'S&P 500' },
  { key: 'dow' as const, label: 'Dow Jones' },
  { key: 'nasdaq' as const, label: 'NASDAQ' },
];

function formatChange(value: number, isPercent = false): string {
  const prefix = value >= 0 ? '+' : '';
  const formatted = isPercent
    ? value.toFixed(2)
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${prefix}${formatted}`;
}

function splitSummary(summaryText: string, reportDate?: string): { title: string; body: string } {
  const trimmed = summaryText.trim();
  const match = trimmed.match(/^([^.!?\n]+[.!?]?)(?:\s+([\s\S]+))?$/);
  const firstSentence = match?.[1]?.trim();
  const remainder = match?.[2]?.trim();

  if (firstSentence && firstSentence.length <= 100) {
    return {
      title: firstSentence,
      body: remainder || '',
    };
  }

  const fallbackTitle = reportDate
    ? `${formatReportDateStatic(reportDate)}`
    : "Today's Market Summary";
  return { title: fallbackTitle, body: trimmed };
}

function formatReportDateStatic(isoDate: string): string {
  const source = new Date(`${isoDate}T12:00:00`);
  return source.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

function formatTime(dateString: string): string {
  if (!dateString) return 'Unknown time';

  // If it's a date-only string (YYYY-MM-DD), anchor it at local noon so
  // "today's report" doesn't read as "8 hours ago" depending on timezone.
  // Otherwise treat it as an ISO timestamp (with or without a 'Z' suffix).
  const isoTimestamp = dateString.length === 10
    ? `${dateString}T12:00:00`
    : (dateString.endsWith('Z') ? dateString : `${dateString}Z`);

  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) return 'Unknown time';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(diffInSeconds / (60 * 60));
  const days = Math.floor(diffInSeconds / (60 * 60 * 24));

  if (diffInSeconds < 60) return 'Just now';   // covers negative diffs (date in future) too
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 3) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getToneStyle(tone: string): {
  label: string;
  Icon: LucideIcon;
  badge: string;
  iconWrap: string;
} {
  const t = tone.toLowerCase();
  if (t.includes('bull')) {
    return {
      label: tone,
      Icon: TrendingUp,
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      iconWrap: 'bg-emerald-100 text-emerald-600',
    };
  }
  if (t.includes('bear')) {
    return {
      label: tone,
      Icon: TrendingDown,
      badge: 'bg-red-50 text-red-700 ring-red-600/20',
      iconWrap: 'bg-red-100 text-red-600',
    };
  }
  return {
    label: tone,
    Icon: BarChart3,
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    iconWrap: 'bg-blue-100 text-blue-600',
  };
}

export function EODReport() {
  const router = useRouter();
  const [liveUpdates, setLiveUpdates] = useState<FinancialSummary[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [isPostingToForum, setIsPostingToForum] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${ML_URL}/financial-summaries?limit=1`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: FinancialSummary[]) => {
        if (!cancelled) setLiveUpdates(data);
      })
      .catch((err) => {
        console.error('Failed to load financial summaries:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/market-data')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MarketData) => {
        if (!cancelled) setMarketData(data);
      })
      .catch((err) => {
        console.error('Failed to load market data:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingMarket(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatReportDate = (isoDate?: string) =>
    isoDate ? formatReportDateStatic(isoDate) : formatReportDateStatic(new Date().toISOString().slice(0, 10));

  const reportsArchiveHref = `${ML_URL}/test_reports.html`;

  const handleDiscussInForum = async () => {
    if (isPostingToForum) return;
    const latest = liveUpdates[0];
    if (!latest) {
      router.push('/forum');
      return;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('Token');
    if (!token) {
      alert('Please log in to create a forum discussion.');
      router.push('/login');
      return;
    }

    const summaryText = latest.summary_text?.trim() || 'Daily market summary';
    const { title, body } = splitSummary(summaryText, latest.report_date);
    const threadTitle = title || `EOD Discussion - ${formatReportDate(latest.report_date)}`;
    const threadContent = body || summaryText;

    setIsPostingToForum(true);
    try {
      const existingThreadsResponse = await fetch(`${API_URL}/threads/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (existingThreadsResponse.ok) {
        const existingThreads = await existingThreadsResponse.json();
        const existingThread = Array.isArray(existingThreads)
          ? existingThreads.find((thread: any) =>
            (thread.category || '') === 'EOD Discussion' &&
            (thread.title || '').trim().toLowerCase() === threadTitle.trim().toLowerCase()
          )
          : null;
        if (existingThread?.id) {
          router.push(`/forum?threadId=${existingThread.id}`);
          return;
        }
      }

      const response = await fetch(`${API_URL}/threads/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: threadTitle,
          category: 'EOD Discussion',
          content: threadContent,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to create discussion thread');
      }
      const created = await response.json().catch(() => ({}));
      if (created?.id) {
        router.push(`/forum?threadId=${created.id}`);
      } else {
        router.push('/forum');
      }
    } catch (error) {
      console.error('Error creating forum thread:', error);
      alert(error instanceof Error ? error.message : 'Failed to create discussion thread');
    } finally {
      setIsPostingToForum(false);
    }
  };

  const sectors =
    liveUpdates[0]?.sectors?.length
      ? liveUpdates[0].sectors.map((s) => ({
        name: s.sector_name,
        change: Math.abs(parseFloat(s.performance_percentage) || 0),
        isPositive: s.is_positive,
      }))
      : marketData?.sectorPerformance ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                End of Day Report
              </h1>
            </div>
            <p className="text-gray-600 mb-2">
              AI-Powered Summary from Wall Street Journal Articles
            </p>
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>
                {loadingSummary ? '…' : formatReportDate(liveUpdates[0]?.report_date)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {INDEX_CARDS.map(({ key, label }) => {
          const quote = marketData?.marketSummary[key];
          const isPositive = (quote?.change ?? 0) >= 0;

          return (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{label}</h3>
                {loadingMarket ? null : isPositive ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              {loadingMarket ? (
                <p className="text-gray-500 text-sm">Loading…</p>
              ) : quote ? (
                <>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {quote.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {formatChange(quote.change)}
                    </span>
                    <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      ({formatChange(quote.percent, true)}%)
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Unavailable</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-6 h-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">End of Day Summary</h2>
              </div>
              <button
                type="button"
                onClick={handleDiscussInForum}
                disabled={isPostingToForum || loadingSummary || liveUpdates.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isPostingToForum ? 'Posting…' : 'Discuss in Forum'}</span>
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
              {loadingSummary ? (
                <p className="p-6 text-gray-500 text-sm">Loading latest updates…</p>
              ) : liveUpdates.length === 0 ? (
                <p className="p-6 text-gray-500 text-sm">No updates available right now.</p>
              ) : (
                liveUpdates.map((update) => {
                  const tone = getToneStyle(update.market_tone || 'Neutral');
                  const { title, body } = splitSummary(update.summary_text, update.report_date);
                  const dateLabel = formatTime(update.report_date);
                  const ToneIcon = tone.Icon;
                  const sources = Array.from(
                    new Set(
                      (update.source_urls || '')
                        .split(/[|,]/)
                        .map((s) => s.trim())
                        .filter((url) => /^https?:\/\//i.test(url))
                    )
                  );
                  const visibleSources = sources.slice(0, 3);
                  return (
                    <a
                      key={update.id}
                      href={reportsArchiveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone.iconWrap}`}>
                            <Newspaper className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ring-1 ring-inset ${tone.badge}`}
                            >
                              <ToneIcon className="w-3.5 h-3.5" />
                              {tone.label}
                            </span>
                            <span className="text-xs text-gray-500">{dateLabel}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 leading-snug mb-3 group-hover:text-blue-700 transition-colors">
                            {title}
                          </h3>
                          {body ? (
                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                              {body}
                            </p>
                          ) : null}
                          {visibleSources.length > 0 ? (
                            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Source articles
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                              {visibleSources.map((url) => {
                                let host = url;
                                try {
                                  host = new URL(url).hostname.replace(/^www\./, '');
                                } catch { }
                                return (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title={url}
                                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                  >
                                    {host}
                                  </a>
                                );
                              })}
                              {sources.length > visibleSources.length ? (
                                <span className="text-xs text-gray-500">
                                  +{sources.length - visibleSources.length} more
                                </span>
                              ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>

          {/* Sector Performance */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sector Performance</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {loadingMarket && !liveUpdates[0]?.sectors?.length ? (
                <p className="text-gray-500 text-sm">Loading sector data…</p>
              ) : sectors.length === 0 ? (
                <p className="text-gray-500 text-sm">Sector data unavailable.</p>
              ) : (
                <div className="space-y-4">
                  {sectors.map((sector, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">{sector.name}</span>
                      <div className="flex items-center space-x-2">
                        {sector.isPositive ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-semibold">+{sector.change}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="text-red-600 font-semibold">-{sector.change}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Gainers</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
              {loadingMarket ? (
                <p className="p-4 text-gray-500 text-sm">Loading…</p>
              ) : (marketData?.topGainers ?? []).length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">No data available.</p>
              ) : (
                marketData!.topGainers.map((stock) => (
                  <div key={stock.symbol} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="font-semibold text-gray-900">{stock.symbol}</div>
                        <div className="text-xs text-gray-500">{stock.name}</div>
                      </div>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-900 font-medium">${stock.price.toLocaleString()}</span>
                      <span className="text-green-600 font-semibold">
                        {formatChange(stock.change, true)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Losers</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
              {loadingMarket ? (
                <p className="p-4 text-gray-500 text-sm">Loading…</p>
              ) : (marketData?.topLosers ?? []).length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">No data available.</p>
              ) : (
                marketData!.topLosers.map((stock) => (
                  <div key={stock.symbol} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="font-semibold text-gray-900">{stock.symbol}</div>
                        <div className="text-xs text-gray-500">{stock.name}</div>
                      </div>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-900 font-medium">${stock.price.toLocaleString()}</span>
                      <span className="text-red-600 font-semibold">
                        {formatChange(stock.change, true)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
