import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Eye, Clock, Search, Filter, Plus, TrendingUp, Calendar, Sparkles, Send, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';


interface Comment {
  id: number;
  threadId: number;
  author: string;
  content: string;
  likes: number;
  dislikes: number;
  timeAgo: string;
  userId?: number;
}

interface Thread {
  id: number;
  title: string;
  author: string;
  category: string;
  content: string;
  replies: number;
  views: number;
  likes: number;
  dislikes: number;
  timeAgo: string;
  isPinned?: boolean;
}

export function Forum() {
  const { user } = useAuth();

  const [forumThreads, setForumThreads] = useState<Thread[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [newCommentText, setNewCommentText] = useState<{ [key: number]: string }>({});

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);

  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState('');

  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [likedThreads, setLikedThreads] = useState<Set<number>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editThreadTitle, setEditThreadTitle] = useState('');
  const [editThreadContent, setEditThreadContent] = useState('');
  const [editCommentContent, setEditCommentContent] = useState('');
  const [showEditThreadModal, setShowEditThreadModal] = useState(false);
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState<number | null>(null);

const categories = [
  'All Categories',
  'EOD Discussion',
  'Beginner Questions',
  'Education',
  'Market Analysis',
  'Strategies',
];

const fetchThreads = async () => {
  try {
    const response = await fetch(`${API_URL}/threads/`);
    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }
    const data = await response.json();
    console.log("Thread data:", data);
    
    const formattedThreads = data.map((thread: any) => ({
      id: thread.id,
      title: thread.title,
      author: thread.author_username || 'Unknown',
      category: thread.category,
      content: thread.content,
      replies: thread.replies_count ?? 0,
      views: thread.views ?? 0,
      likes: thread.likes_count ?? 0,
      timeAgo: 'Just now',
      isPinned:false,
    }));

    setForumThreads(formattedThreads);
  } catch (error) {
    console.error('Error fetching threads:', error);
  }
};

const fetchComments = async (threadId: number) => {
  try {
    const response = await fetch('http://localhost:8000/comments/thread/${threadId}');
    const data = await response.json();

    const formattedComments = data.map((c: any) => ({
      id: c.id,
      threadId: c.thread_id,
      userId: c.user_id,
      author: c.author_username || 'Unknown',
      content: c.content,
      likes: c.likes || 0,
      timeAgo: 'Just now',
    }));

    setComments(prev =>{
      const filteredComments = prev.filter(c => c.threadId !== threadId);
      return [...filteredComments, ...formattedComments];
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
};

useEffect(() => {
  fetchThreads();
}, []);

const toggleThread = (threadId: number) => { 
  setExpandedThreads(prev => {
    const newSet = new Set(prev);
    if (newSet.has(threadId)) {
      newSet.delete(threadId);
    } else {
      newSet.add(threadId);
      fetchComments(threadId);
    }
    return newSet;
  });
};

const getThreadComments = (threadId: number) => {
  return comments.filter(c => c.threadId === threadId);
}

const handleLikeThread = async (threadId: number) => {
  if (!user) return;
  const isLiked = likedThreads.has(threadId);
  try {
    await fetch(`${API_URL}/threads/${threadId}/${isLiked ? 'unlike' : 'like'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (isLiked) {
      setLikedThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    } else {
      setLikedThreads(prev => new Set(prev).add(threadId));
    }
  } catch (error) {
    console.error('Error liking thread:', error);
  }
};

const handleLikeComment = async (commentId: number) => {
  if (!user) return;
  const isLiked = likedComments.has(commentId);
  try {
    await fetch(`${API_URL}/comments/${commentId}/${isLiked ? 'unlike' : 'like'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (isLiked) {
      setLikedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      setLikedComments(prev => new Set(prev).add(commentId));
    }
  } catch (error) {
    console.error('Error liking comment:', error);
  }
};

const handlePostComment = async (threadId: number) => {
  const content = newCommentText[threadId]?.trim();
  if (!content || !user) return
  try {
    await fetch(`${API_URL}/comments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        thread_id: threadId,
        content,
      }),
  });

  setNewCommentText(prev => ({ ...prev, [threadId]: '' }));
  await fetchComments(threadId);
}   catch (error) {
    console.error('Error posting comment:', error);
  }
}

const handleReportComment = (comment: Comment) => {
  setReportingComment(comment);
  setShowReportModal(true);
};

const handleEditThread = async () => {
  if (!editingThreadId || !editThreadTitle.trim() || !editThreadContent.trim()) return;
  try {
    const response = await fetch(`${API_URL}/threads/${editingThreadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        title: editThreadTitle,
        content: editThreadContent,
      }),
    });
    if (response.ok) {
      setShowEditThreadModal(false);
      setEditingThreadId(null);
      await fetchThreads();
    }
  } catch (error) {
    console.error('Error editing thread:', error);
  }
};

const handleDeleteThread = async (threadId: number) => {
  if (!window.confirm('Are you sure you want to delete this thread?')) return;
  try {
    const response = await fetch(`${API_URL}/threads/${threadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (response.ok) {
      await fetchThreads();
    }
  } catch (error) {
    console.error('Error deleting thread:', error);
  }
};

const handleEditComment = async () => {
  if (!editingCommentId || !editCommentContent.trim()) return;
  try {
    const response = await fetch(`${API_URL}/comments/${editingCommentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        content: editCommentContent,
      }),
    });
    if (response.ok) {
      setShowEditCommentModal(false);
      setEditingCommentId(null);
      const threadId = comments.find(c => c.id === editingCommentId)?.threadId;
      if (threadId) await fetchComments(threadId);
    }
  } catch (error) {
    console.error('Error editing comment:', error);
  }
};

const handleDeleteComment = async (commentId: number, threadId: number) => {
  if (!window.confirm('Are you sure you want to delete this comment?')) return;
  try {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (response.ok) {
      await fetchComments(threadId);
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
  }
};

const submitReport = async (reason: string) => {
  if (!reportingComment) return;
  try {
    await fetch(`${API_URL}/reports/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        comment_id: reportingComment.id,
        reason,
      }),
    });
  } catch (error) {
    console.error('Error submitting report:', error);
  }
};

const handleCreateThread = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user){
    alert('You must be logged in to create a thread.');
    return;
  }
  if (!newThreadTitle.trim() || !newThreadContent.trim() || !newThreadCategory) {
    alert('Please fill in all fields to create a thread.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/threads/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        title: newThreadTitle,
        content: newThreadContent,
        category: newThreadCategory,
      }),
    });

    const data = await response.json();
    console.log('FULL BACKEND RESPONSE:', data);

    if (!response.ok) {
      alert(JSON.stringify(data));
      throw new Error(data.error || 'Failed to create thread');
    }
    setShowNewThreadModal(false);
    setNewThreadTitle('');
    setNewThreadContent('');
    setNewThreadCategory('');

    await fetchThreads();
  } catch (error) {
    console.error('Error creating thread:', error);
    alert('There was an error creating the thread. Please try again.');
  }
};
const filteredThreads = forumThreads.filter(t => {
  const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesCategory = selectedCategory === 'All Categories' || t.category === selectedCategory;
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
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-6 py-3 bg-blue-950 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New Thread</span>
          </button>
        </div>

        {/* EOD Report Banner */}
        <div className="bg-gradient-to-r from-blue-950 to-indigo-300 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-white">
                <h3 className="font-semibold mb-1">Today's End of Day Report is Available!</h3>
                <p className="text-blue-100 text-sm mb-3">
                  Check out the latest market summary from Wall Street Journal and join the discussion.
                </p>
                <a
                  href="/eod-report"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
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
        {filteredThreads.map((thread) => {
          const isExpanded = expandedThreads.has(thread.id);
          const threadComments = getThreadComments(thread.id);

          return (
            <div
              key={thread.id}
              className={`bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all ${
                thread.isPinned ? 'ring-2 ring-blue-100' : ''
              }`}
            >
              <div className="p-6">
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
                      {user?.name === thread.author && (
                        <div className="relative">
                          <button
                            onClick={() => setThreadMenuOpen(threadMenuOpen === thread.id ? null : thread.id)}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {threadMenuOpen === thread.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={() => {
                                  setEditingThreadId(thread.id);
                                  setEditThreadTitle(thread.title);
                                  setEditThreadContent(thread.content);
                                  setShowEditThreadModal(true);
                                  setThreadMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit Thread</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteThread(thread.id);
                                  setThreadMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center space-x-2 text-sm text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Thread</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {thread.title}
                    </h3>

                    <p className="text-gray-600 text-sm mb-3">
                      {thread.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="font-medium text-gray-700">{thread.author}</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(thread.timeAgo)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{threadComments.length} replies</span>
                      </div>
                      <button
                        onClick={() => handleLikeThread(thread.id)}
                        className={`flex items-center space-x-1 transition-colors ${
                          likedThreads.has(thread.id)
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{thread.likes} likes</span>
                      </button>
                    </div>

                    {/* View Comments Button */}
                    <button
                      onClick={() => toggleThread(thread.id)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Hide comments</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>View {threadComments.length} {threadComments.length === 1 ? 'comment' : 'comments'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* Existing Comments */}
                  <div className="space-y-4 mb-4">
                    {threadComments.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      threadComments.map((comment) => (
                        <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-semibold">
                                {comment.author.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900 text-sm">{comment.author}</span>
                                  <span className="text-gray-500 text-xs">•</span>
                                  <span className="text-gray-500 text-xs">{formatTime(comment.timeAgo)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleReportComment(comment)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Report comment"
                                  >
                                    <Flag className="w-4 h-4" />
                                  </button>
                                  {user?.name === comment.author && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditCommentContent(comment.content);
                                          setShowEditCommentModal(true);
                                        }}
                                        className="text-gray-400 hover:text-blue-500 transition-colors"
                                        title="Edit comment"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(comment.id, thread.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete comment"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{comment.content}</p>
                              <button
                                onClick={() => handleLikeComment(comment.id)}
                                className={`flex items-center space-x-1 transition-colors text-xs ${
                                  likedComments.has(comment.id)
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-blue-600'
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{comment.likes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-semibold">
                          {user?.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newCommentText[thread.id] || ''}
                          onChange={(e) => setNewCommentText(prev => ({ ...prev, [thread.id]: e.target.value }))}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                          rows={3}
                        />
                        <div className="flex items-center justify-end mt-2">
                          <button
                            onClick={() => handlePostComment(thread.id)}
                            disabled={!newCommentText[thread.id]?.trim()}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            <Send className="w-4 h-4" />
                            <span>Post Comment</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Thread</h2>
            <form 
              onSubmit={handleCreateThread}
              className='space-y-6'
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select 
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="" disabled>
                    Select a category
                    </option>
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
                  value ={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  rows={6}
                  value ={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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

      {/* Report Comment Modal */}
      {showReportModal && reportingComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Flag className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Report Comment</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">{reportingComment.content}</p>
              <p className="text-xs text-gray-500 mt-2">by {reportingComment.author}</p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700">Select a reason:</p>
              {['Spam/Scam', 'Harassment/Bullying', 'Offensive Language', 'Misinformation', 'Other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => submitReport(reason)}
                  className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {reason}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowReportModal(false);
                setReportingComment(null);
              }}
              className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Thread Modal */}
      {showEditThreadModal && editingThreadId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Thread</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thread Title
                </label>
                <input
                  type="text"
                  value={editThreadTitle}
                  onChange={(e) => setEditThreadTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  rows={6}
                  value={editThreadContent}
                  onChange={(e) => setEditThreadContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditThreadModal(false);
                    setEditingThreadId(null);
                  }}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditThread}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Comment Modal */}
      {showEditCommentModal && editingCommentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Comment</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  rows={4}
                  value={editCommentContent}
                  onChange={(e) => setEditCommentContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCommentModal(false);
                    setEditingCommentId(null);
                  }}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditComment}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
