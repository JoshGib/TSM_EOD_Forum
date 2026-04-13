import { useState } from 'react';
import { MessageSquare, ThumbsUp, Eye, Clock, Search, Filter, Plus, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Thread {
  id: number;
  title: string;
  author: string;
  category: string;
  content: string;
  replies: number;
  views: number;
  likes: number;
  timeAgo: string;
  isPinned?: boolean;
}

const forumThreads: Thread[] = [
  {
    id: 1,
    title: 'Feb 25 EOD: Tech Rally Discussion - What drove NVIDIA\'s gains?',
    author: 'InvestorMike',
    category: 'EOD Discussion',
    content: 'Based on today\'s EOD report showing NVIDIA up 8.67%, what factors contributed to this rally? Let\'s discuss the implications.',
    replies: 24,
    views: 342,
    likes: 15,
    timeAgo: '2 hours ago',
    isPinned: true,
  },
  {
    id: 2,
    title: 'Understanding P/E Ratios - A Simple Explanation for Beginners',
    author: 'FinanceGuru',
    category: 'Education',
    content: 'Let me break down what P/E ratios mean and how to use them when evaluating stocks. Perfect for first-time investors...',
    replies: 18,
    views: 567,
    likes: 42,
    timeAgo: '5 hours ago',
    isPinned: true,
  },
  {
    id: 3,
    title: 'Energy Sector Weakness - Analysis from Today\'s Report',
    author: 'MarketWatcher',
    category: 'EOD Discussion',
    content: 'The EOD report shows energy sector down 0.34%. Let\'s discuss crude oil concerns and what this means for energy stocks.',
    replies: 31,
    views: 789,
    likes: 23,
    timeAgo: '8 hours ago',
  },
  {
    id: 4,
    title: 'Getting Started: What should I invest in as a beginner?',
    author: 'NewbieTom',
    category: 'Beginner Questions',
    content: 'I just opened my first brokerage account and have $1000 to start. Should I go with index funds or individual stocks?',
    replies: 45,
    views: 1234,
    likes: 67,
    timeAgo: '1 day ago',
  },
  {
    id: 5,
    title: 'How to interpret the VIX (Volatility Index)?',
    author: 'LearningDaily',
    category: 'Beginner Questions',
    content: 'Can someone explain what the VIX means and how I should use it to understand market sentiment?',
    replies: 12,
    views: 234,
    likes: 8,
    timeAgo: '1 day ago',
  },
  {
    id: 6,
    title: 'Dollar-Cost Averaging Strategy for New Investors',
    author: 'DividendDave',
    category: 'Strategies',
    content: 'Here\'s my approach to building a portfolio gradually through dollar-cost averaging, perfect for beginners...',
    replies: 27,
    views: 445,
    likes: 19,
    timeAgo: '2 days ago',
  },
];

const categories = [
  'All Categories',
  'EOD Discussion',
  'Beginner Questions',
  'Education',
  'Market Analysis',
  'Strategies',
];

export function Forum() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const { user } = useAuth();

  const filteredThreads = forumThreads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         thread.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || thread.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Community Forum
            </h1>
            <p className="text-gray-600">
              Structured discussions for first-time investors. Learn together, share insights, and ask questions.
            </p>
          </div>
          <button
            onClick={() => setShowNewThreadModal(true)}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New Thread</span>
          </button>
        </div>

        {/* EOD Report Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Sparkles className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div className="text-white">
                <h3 className="font-semibold mb-1">Today's End of Day Report is Available!</h3>
                <p className="text-blue-100 text-sm mb-3">
                  Check out the latest market summary from Wall Street Journal and join the discussion.
                </p>
                <a
                  href="/eod-report"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  <span>View EOD Report</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-10 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Forum Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">156</div>
          <div className="text-sm text-gray-600">Total Threads</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">2.4k</div>
          <div className="text-sm text-gray-600">Total Posts</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">847</div>
          <div className="text-sm text-gray-600">Members</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">23</div>
          <div className="text-sm text-gray-600">Active Now</div>
        </div>
      </div>

      {/* Thread List */}
      <div className="space-y-4">
        {filteredThreads.map((thread) => (
          <div
            key={thread.id}
            className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer ${
              thread.isPinned ? 'ring-2 ring-blue-100' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {thread.author.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    {thread.isPinned && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Pinned
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      thread.category === 'EOD Discussion' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {thread.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                  {thread.title}
                </h3>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {thread.content}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{thread.author}</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{thread.timeAgo}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{thread.replies} replies</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{thread.views} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{thread.likes} likes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Thread</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {categories.filter(cat => cat !== 'All Categories').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thread Title
                </label>
                <input
                  type="text"
                  placeholder="Enter a descriptive title..."
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  rows={6}
                  placeholder="Share your thoughts, questions, or insights..."
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Post Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
