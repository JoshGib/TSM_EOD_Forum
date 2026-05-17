"use client"

// /**
//  * DEMO USERS FOR TESTING:
//  * 
//  * Regular User:
//  *   Email: demo@example.com
//  *   Password: password
//  *   Name: Sarah
//  * 
//  * Admin User:
//  *   Email: admin@example.com
//  *   Password: password
//  *   Name: Demo Admin
//  */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);


  
  const signup = async (name: string, email: string, password: string) => {
    setError(null);
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.detail || 'Signup failed');
      return;
    }

    // Backend signup currently returns a status message only,
    // so perform login immediately to hydrate full user + token.
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok) {
      setError(loginData.detail || 'Signup succeeded but auto-login failed');
      return;
    }

    const userData: User = {
      id: loginData.user.id || '',
      email: loginData.user.email || email,
      name: loginData.user.username || name,
      role: loginData.user.role || 'user',
      isAdmin: loginData.user.role === 'admin',
    };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', loginData.access_token);
  };


  
  const login = async (email: string, password: string) => {
    setError(null);

    // // Demo admin user logic
    // if (email === 'admin@example.com' && password === 'password') {
    //   const demoAdminUser: User = {
    //     id: 'admin-123',
    //     email: 'admin@example.com',
    //     name: 'Demo Admin',
    //     role: 'admin',
    //     isAdmin: true,
    //   };
    //   setUser(demoAdminUser);
    //   localStorage.setItem('user', JSON.stringify(demoAdminUser));
    //   return;
    // }

    // // Demo regular user logic
    // if (email === 'demo@example.com' && password === 'password') {
    //   const demoUser: User = {
    //     id: 'demo-user-456',
    //     email: 'demo@example.com',
    //     name: 'Sarah',
    //     role: 'user',
    //     isAdmin: false,
    //   };
    //   setUser(demoUser);
    //   localStorage.setItem('user', JSON.stringify(demoUser));
    //   return;
    // }
    
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setError(data.detail || 'Login failed');
      setUser(null);
      localStorage.removeItem('user');
      throw new Error(data.detail || 'Login failed');
    }

    const userData: User = {
      id: data.user.id || '',
      email,
      name: data.user.username || '',
      role: data.user.role || '',
      isAdmin: data.user.role === 'admin',
    };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', data.access_token);
  };


  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('Token');
  };

  const updateUserProfile = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      updateUserProfile,
      logout,
      isAuthenticated: !!user,
      loading,
      error
    }}
  >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
