'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUserPayload, UserRole } from '@shop-sell/shared';

function setSessionCookies(token: string, roles: UserRole[]) {
  if (typeof document !== 'undefined') {
    document.cookie = `shopsell_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `shopsell_roles=${encodeURIComponent(JSON.stringify(roles))}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearSessionCookies() {
  if (typeof document !== 'undefined') {
    document.cookie = 'shopsell_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'shopsell_roles=; path=/; max-age=0; SameSite=Lax';
  }
}

interface AuthContextType {
  user: AuthUserPayload | null;
  roles: UserRole[];
  isLoading: boolean;
  isCustomer: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  token: string | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (
    identifier: string
  ) => Promise<{
    success: boolean;
    message?: string;
    phone?: string;
    cooldownSeconds?: number;
    error?: string;
  }>;
  verifyOtp: (
    identifier: string,
    otp: string,
    firebaseVerified?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginAsDevRole: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: ['customer'],
  isLoading: true,
  isCustomer: true,
  isSeller: false,
  isAdmin: false,
  token: null,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
  forgotPassword: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  loginAsDevRole: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted token or session on mount
    let savedToken = typeof window !== 'undefined' ? localStorage.getItem('shopsell_token') : null;
    let savedUser = typeof window !== 'undefined' ? localStorage.getItem('shopsell_user') : null;

    if (!savedToken && typeof document !== 'undefined') {
      const matchToken = document.cookie.match(/shopsell_token=([^;]+)/);
      const matchRoles = document.cookie.match(/shopsell_roles=([^;]+)/);
      if (matchToken && matchToken[1]) {
        savedToken = decodeURIComponent(matchToken[1]);
        let roles: UserRole[] = ['customer'];
        if (matchRoles && matchRoles[1]) {
          try {
            roles = JSON.parse(decodeURIComponent(matchRoles[1]));
          } catch {}
        }
        savedUser = JSON.stringify({
          id: 'dev_user',
          email: 'user@shopsell.dev',
          roles,
        });
      }
    }

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        setSessionCookies(savedToken, parsed.roles || ['customer']);
      } catch (err) {
        console.error('Failed to parse saved user', err);
      }
    }
    setIsLoading(false);
  }, []);

  const setAuthSession = useCallback((authToken: string, authUser: AuthUserPayload) => {
    setToken(authToken);
    setUser(authUser);
    setSessionCookies(authToken, authUser.roles || ['customer']);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shopsell_token', authToken);
      localStorage.setItem('shopsell_user', JSON.stringify(authUser));
    }
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      setAuthSession(data.token, data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Account creation failed' };
      }

      setAuthSession(data.token, data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (identifier: string) => {
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier, identifier }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send verification code',
        };
      }

      return {
        success: true,
        message: data.message,
        phone: data.phone || data.target,
        cooldownSeconds: data.cooldownSeconds || 30,
      };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const verifyOtp = async (identifier: string, otp: string, firebaseVerified = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier, identifier, otp, firebaseVerified }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Verification failed' };
      }

      setAuthSession(data.token, data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Request failed' };
      }

      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Password update failed' };
      }

      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDevRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const roles: UserRole[] = role === 'owner' ? ['customer', 'owner'] : [role];
      const res = await fetch('/api/auth/dev-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `dev-${role}-uuid`,
          email: `${role}@shopsell.test`,
          roles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const userObj: AuthUserPayload = {
          sub: `dev-${role}-uuid`,
          email: `${role}@shopsell.test`,
          roles,
          user_metadata: { full_name: `Dev ${role.toUpperCase()} User` },
        };
        setAuthSession(data.token, userObj);
      }
    } catch (err) {
      console.warn('Backend not yet reachable for dev-token minting, using client mock state', err);
      const roles: UserRole[] = role === 'owner' ? ['customer', 'owner'] : [role];
      const mockUser: AuthUserPayload = {
        sub: `dev-${role}-uuid`,
        email: `${role}@shopsell.test`,
        roles,
        user_metadata: { full_name: `Dev ${role.toUpperCase()} User` },
      };
      setAuthSession(`dev_mock_token_${role}`, mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearSessionCookies();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopsell_token');
      localStorage.removeItem('shopsell_user');
    }
  };

  const roles = user?.roles || ['customer'];
  const isCustomer = roles.includes('customer');
  const isSeller = roles.includes('owner');
  const isAdmin = roles.includes('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        isLoading,
        isCustomer,
        isSeller,
        isAdmin,
        token,
        login,
        signup,
        sendOtp,
        verifyOtp,
        forgotPassword,
        resetPassword,
        loginAsDevRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

