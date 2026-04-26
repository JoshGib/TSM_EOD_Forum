'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, FileText, TrendingUp, MessageSquare, LogOut, Menu, X, Search, Loader2, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from "../contexts/AuthContext";

interface StockSuggestion {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stock suggestions from local API proxy
  const fetchSuggestions = async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.quotes) {
        const stocks: StockSuggestion[] = data.quotes
          .filter((q: any) => q.quoteType === 'EQUITY' && q.exchange)
          .map((q: any) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: q.exchange,
            type: q.quoteType
          }));
        setSuggestions(stocks);
      }
    } catch (error) {
      console.error('Error fetching stock suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion click
  const handleSuggestionClick = (symbol: string) => {
    setSearchQuery(symbol);
    setShowSuggestions(false);
    setSuggestions([]);
    router.push(`/search?q=${encodeURIComponent(symbol)}`);
  };

  // Handle form submission
  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
    setMobileMenuOpen(false);
  };

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/rules', label: 'Rules', icon: FileText },
    { to: '/eod-report', label: 'EOD Report', icon: TrendingUp },
    { to: '/forum', label: 'Forum', icon: MessageSquare },
  ];

  // Add admin link for admin users
  const adminNavItem = user?.isAdmin ? { to: '/admin', label: 'Admin', icon: Shield } : null;

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:inline">TSM Forum</span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md" ref={searchRef}>
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search US stocks..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchSubmit}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full px-4 py-2 pl-10 pr-4 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />
                )}
                
                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {suggestions.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => handleSuggestionClick(stock.symbol)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{stock.symbol}</span>
                          <span className="text-sm text-gray-500 ml-2">{stock.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{stock.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {[...navItems, ...(adminNavItem ? [adminNavItem] : [])].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive(item.to)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="hidden md:flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0)?.toUpperCase()||'?'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700">{user?.name}</span>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
            {/* Search Bar - Mobile */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search US stocks..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                    setSearchQuery('');
                    setMobileMenuOpen(false);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full px-4 py-2 pl-10 pr-4 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              {isLoading && (
                <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />
              )}
              
              {/* Autocomplete Dropdown - Mobile */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => {
                        handleSuggestionClick(stock.symbol);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{stock.symbol}</span>
                        <span className="text-sm text-gray-500 ml-2">{stock.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{stock.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Items */}
            {[...navItems, ...(adminNavItem ? [adminNavItem] : [])].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.to)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* User Section for Authenticated Users */}
            {isAuthenticated && (
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase()||'?'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {/* Auth Links for Unauthenticated Users */}
            {!isAuthenticated && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <Link
                  href="/login?redirect=/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
