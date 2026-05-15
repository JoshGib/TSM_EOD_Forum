'use client';
import { TrendingUp, TrendingDown, DollarSign, Activity, ExternalLink, BookOpen, Lightbulb, Users, BarChart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
const marketNews = [
  {
    id: 1,
    title: 'Market Volatility: What First-Time Investors Need to Know',
    source: 'Wall Street Journal',
    time: '2 hours ago',
    summary: 'Understanding market fluctuations is key to long-term investing success. Learn how to navigate uncertainty and make informed decisions.',
    link: 'https://www.wsj.com',
    category: 'Education',
  },
  {
    id: 2,
    title: 'Tech Sector Shows Strong Gains Amid Economic Optimism',
    source: 'Wall Street Journal',
    time: '4 hours ago',
    summary: 'Major tech companies lead market rally as investors gain confidence in economic outlook and corporate earnings.',
    link: 'https://www.wsj.com',
    category: 'Market News',
  },
  {
    id: 3,
    title: 'Beginner\'s Guide: How to Read Financial Statements',
    source: 'Wall Street Journal',
    time: '6 hours ago',
    summary: 'Master the basics of reading balance sheets, income statements, and cash flow reports to make better investment decisions.',
    link: 'https://www.wsj.com',
    category: 'Education',
  },
  {
    id: 4,
    title: 'Index Funds vs Individual Stocks: What New Investors Should Choose',
    source: 'Wall Street Journal',
    time: '8 hours ago',
    summary: 'Exploring the pros and cons of different investment strategies for those just starting their investment journey.',
    link: 'https://www.wsj.com',
    category: 'Strategy',
  },
];

const tradingApps = [
  {
    name: 'Robinhood',
    description: 'Commission-free trading for beginners',
    link: 'https://robinhood.com',
  },
  {
    name: 'TD Ameritrade',
    description: 'Advanced tools and education resources',
    link: 'https://www.tdameritrade.com',
  },
  {
    name: 'Fidelity',
    description: 'Full-service brokerage with research',
    link: 'https://www.fidelity.com',
  },
  {
    name: 'E*TRADE',
    description: 'User-friendly platform with mobile app',
    link: 'https://us.etrade.com',
  },
];

export function HomeComponent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const handleJoinDiscussion = () => {
    if (!user) {
      router.push('/login?redirect=/forum');
    }
    else{
      router.push('/forum');
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-950 to-indigo-300 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">TSM Forum Feed</h1>
        <p className="text-lg text-blue-100 mb-2 max-w-3xl">
          Empowering First-Time Investors with Accessible Financial Information
        </p>
        <p className="text-blue-100 mb-6 max-w-2xl">
          Get daily market insights summarized from The Wall Street Journal, participate in structured discussions, and connect with a community of learners—all in one place.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://tsmforumfeed-yeww6.ondigitalocean.app/eod-report"
            className="px-6 py-3 bg-white text-blue-800 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            View Today's Report
          </a>
          <button
            onClick={handleJoinDiscussion}
            className="px-6 py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
          >
            Join Discussion
          </button>
        </div>
      </div>

      {/* Platform Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <BarChart className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily EOD Reports</h3>
          <p className="text-gray-600 text-sm">
            AI-powered summaries of Wall Street Journal articles, delivered in digestible format every trading day.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Forum</h3>
          <p className="text-gray-600 text-sm">
            Engage in moderated discussions based on daily reports. Learn from peers and share insights.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Educational Resources</h3>
          <p className="text-gray-600 text-sm">
            Access curated content, trading app links, and resources designed specifically for beginners.
          </p>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">S&P 500</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">5,247.81</div>
          <div className="flex items-center text-sm">
            <span className="text-green-600 font-medium">+1.24%</span>
            <span className="text-gray-500 ml-2">+64.12</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Dow Jones</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">43,892.55</div>
          <div className="flex items-center text-sm">
            <span className="text-green-600 font-medium">+0.87%</span>
            <span className="text-gray-500 ml-2">+378.45</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">NASDAQ</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">16,421.33</div>
          <div className="flex items-center text-sm">
            <span className="text-red-600 font-medium">-0.43%</span>
            <span className="text-gray-500 ml-2">-71.24</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">VIX</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">14.32</div>
          <div className="flex items-center text-sm">
            <span className="text-gray-600 font-medium">-2.15%</span>
            <span className="text-gray-500 ml-2">Low volatility</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* News Feed */}
        <div className="lg:col-span-2" id="news-feed">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Latest Market Insights</h2>
              <p className="text-sm text-gray-600 mt-1">Curated from The Wall Street Journal</p>
            </div>
            <BookOpen className="w-6 h-6 text-gray-400" />
          </div>

          <div className="space-y-4">
            {marketNews.map((news) => (
              <div key={news.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        {news.category}
                      </span>
                      <span className="text-xs text-gray-500">{news.time}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {news.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{news.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{news.source}</span>
                      <a
                        href={news.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <span>Read More</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Getting Started */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">New to Investing?</h2>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <Lightbulb className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Start Your Journey</h3>
              <p className="text-sm text-gray-700 mb-4">
                TSM Forum Feed was created to help first-time investors overcome information overload and build confidence in financial markets.
              </p>
              <a
                href="/rules"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Read Community Guidelines
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>

          {/* Trading Apps */}
          <div id="trading-apps">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Apps</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
              {tradingApps.map((app) => (
                <a
                  key={app.name}
                  href={app.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{app.name}</h3>
                      <p className="text-sm text-gray-600">{app.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1 ml-2" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Resources */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Educational Resources</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <a
                href="https://www.sec.gov/investor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">SEC Investor Education</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="https://www.investopedia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">Investopedia</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="https://www.investor.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">Investor.gov</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
