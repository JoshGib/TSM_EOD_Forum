'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function ProfilePageContent() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadProfile = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load profile');
      setUsername(data.username);
      setNewUsername(data.username);
      setEmail(data.email);
      setRole(data.role);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    }
  };

  useEffect(() => {
    if (token) loadProfile();
  }, [token]);

  const handleUsernameUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      setError(null);
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update username');
      setUsername(data.username);
      setMessage('Username updated successfully.');
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = data.username;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update username');
    }
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      setError(null);
      const res = await fetch(`${API_URL}/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');
      setCurrentPassword('');
      setNewPassword('');
      setMessage(data.message || 'Password changed successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      {message && <div className="mb-4 rounded-lg bg-green-50 text-green-700 px-4 py-3">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Info</h2>
        <p className="text-sm text-gray-600 mb-1">Current Username: <span className="font-medium text-gray-900">{username || user?.name}</span></p>
        <p className="text-sm text-gray-600 mb-1">Email: <span className="font-medium text-gray-900">{email || user?.email}</span></p>
        <p className="text-sm text-gray-600">Role: <span className="font-medium text-gray-900">{role || user?.role}</span></p>
      </div>

      <form onSubmit={handleUsernameUpdate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Username</h2>
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg"
          required
        />
        <button type="submit" className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Update Username
        </button>
      </form>

      <form onSubmit={handlePasswordUpdate} className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg"
            required
          />
        </div>
        <button type="submit" className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Update Password
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
