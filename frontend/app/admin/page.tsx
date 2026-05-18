'use client';

import { AlertTriangle, Ban, ChevronDown, ChevronUp, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminRoute } from '../components/ProtectedRoute';

interface FlagReason {
  userId: string;
  userName: string;
  reason: string;
  timestamp: string;
}

interface ReportedComment {
  id: number;
  commentId: number;
  content: string;
  author: string;
  authorId: number;
  threadTitle: string;
  flags: FlagReason[];
  createdAt: string;
}

// const mockReportedComments: ReportedComment[] = [
//   {
//     id: '1',
//     commentId: 'c123',
//     content: 'This is complete garbage advice. Anyone who follows this will lose all their money. You\'re all idiots.',
//     author: 'aggressive_trader',
//     authorId: 'u456',
//     threadTitle: 'EOD Report - April 25, 2026: Tech Sector Rally',
//     flags: [
//       {
//         userId: 'u789',
//         userName: 'john_doe',
//         reason: 'Harassment/Bullying',
//         timestamp: '2026-04-26T10:30:00Z',
//       },
//       {
//         userId: 'u012',
//         userName: 'jane_smith',
//         reason: 'Offensive Language',
//         timestamp: '2026-04-26T11:15:00Z',
//       },
//       {
//         userId: 'u345',
//         userName: 'mike_jones',
//         reason: 'Harassment/Bullying',
//         timestamp: '2026-04-26T12:45:00Z',
//       },
//     ],
//     createdAt: '2026-04-26T09:00:00Z',
//   },
//   {
//     id: '2',
//     commentId: 'c456',
//     content: 'GUARANTEED 1000% RETURNS! Click here to join my exclusive trading group. Limited spots available!',
//     author: 'quick_profits',
//     authorId: 'u678',
//     threadTitle: 'Q&A: How to Start Investing',
//     flags: [
//       {
//         userId: 'u901',
//         userName: 'sarah_williams',
//         reason: 'Spam/Scam',
//         timestamp: '2026-04-25T16:20:00Z',
//       },
//       {
//         userId: 'u234',
//         userName: 'david_brown',
//         reason: 'Spam/Scam',
//         timestamp: '2026-04-25T17:00:00Z',
//       },
//     ],
//     createdAt: '2026-04-25T15:00:00Z',
//   },
//   {
//     id: '3',
//     commentId: 'c789',
//     content: 'I think the market might go up or down tomorrow based on the Fed announcement.',
//     author: 'market_watcher',
//     authorId: 'u567',
//     threadTitle: 'EOD Report - April 24, 2026: Federal Reserve Decision',
//     flags: [
//       {
//         userId: 'u890',
//         userName: 'chris_lee',
//         reason: 'Misinformation',
//         timestamp: '2026-04-24T14:30:00Z',
//       },
//     ],
//     createdAt: '2026-04-24T13:00:00Z',
//   },
// ];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


function AdminPageContent() {
  const [reports, setReports] = useState<ReportedComment[]>([]);
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/admin/reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await res.json();
      const formatted: ReportedComment[] = data.map((item: any) => ({
        id: item.id,
        commentId: item.comment_id,
        content: item.comment_content,
        author: item.author_name,
        authorId: item.author_id,
        threadTitle: item.thread_title,
        createdAt: item.created_at,
        flags: (item.flags || []).map((flag: any) => ({
          userId: flag.user_id,
          userName: flag.user_name,
          reason: flag.reason,
          timestamp: flag.timestamp,
        })),
      }));
      setReports(formatted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {fetchReports()}, []);

  const toggleExpanded = (reportId: number) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    }
    );
  };

  const handleDeleteComment = async (reportId: number, commentId: number) => {
    if(!commentId)
      return;
    if (confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      await fetch(`${API_URL}/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
          
        },
        
      });
      fetchReports();
    }
  };

  const handleBlacklistUser = async (reportId: number, userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to blacklist user "${userName}"? They will no longer be able to post.`)) {
      await fetch(`${API_URL}/admin/blacklist/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, reason: 'User blacklisted by admin' }),
      });
      setReports(prev => prev.filter(report => report.id !== reportId));
      console.log(`Blacklisted user: ${userId}`);
    }
  };

  const handleDismiss = async (reportId: number) => {
    if (confirm('Are you sure you want to dismiss this report?')) {
      await fetch(`${API_URL}/admin/reports/${reportId}/dismiss`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchReports();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getSeverityColor = (flagCount: number) => {
    if (flagCount >= 3) return 'bg-red-100 text-red-800 border-red-300';
    if (flagCount === 2) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-600">Manage reported comments and user moderation</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{reports.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {reports.filter(r => r.flags.length >= 3).length}
                </p>
              </div>
              <Ban className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Flags</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {reports.reduce((sum, r) => sum + r.flags.length, 0)}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Reported Comments List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Reported Comments</h2>
          </div>

          {reports.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No reported comments</p>
              <p className="text-sm text-gray-500 mt-1">All clear! There are no pending reports.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reports.map((report) => {
                const isExpanded = expandedReports.has(report.id);
                const flagCount = report.flags.length;

                return (
                  <div key={report.id} className="px-6 py-5">
                    {/* Report Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(flagCount)}`}>
                            {flagCount} {flagCount === 1 ? 'Flag' : 'Flags'}
                          </span>
                          <span className="text-sm text-gray-500">{report.threadTitle}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                          <span className="font-medium">{report.author}</span>
                          <span>•</span>
                          <span>{formatTimestamp(report.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Comment Content */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-gray-900">{report.content}</p>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleExpanded(report.id)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 mb-3"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Hide flag details</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>View {flagCount} {flagCount === 1 ? 'flag' : 'flags'}</span>
                        </>
                      )}
                    </button>

                    {/* Flag Details */}
                    {isExpanded && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 space-y-3">
                        {report.flags.map((flag, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-medium">
                                {flag.userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{flag.userName}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">{formatTimestamp(flag.timestamp)}</span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">
                                <span className="font-medium">Reason:</span> {flag.reason}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDeleteComment(report.id, report.commentId)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Comment</span>
                      </button>
                      <button
                        onClick={() => handleBlacklistUser(report.id, report.authorId, report.author)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Blacklist User</span>
                      </button>
                      <button
                        onClick={() => handleDismiss(report.id)}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <span>Dismiss Report</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminPageContent />
    </AdminRoute>
  );
}
