'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUserPayload, UserRole } from '@shop-sell/shared';

// Startup check: Demo accounts strictly prohibited in production
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  (process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true' || process.env.ENABLE_DEMO_ACCOUNTS === 'true')
) {
  throw new Error('FATAL SECURITY ERROR: ENABLE_DEMO_ACCOUNTS cannot be active in production.');
}

interface AuthContextType {
  user: AuthUserPayload | null;
  roles: UserRole[];
  isLoading: boolean;
  isCustomer: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  token: string | null;
  login: (email: string, password?: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    fullName: string,
    email: string,
    password: string,
    phone?: string,
    turnstileToken?: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (
    identifier: string,
    turnstileToken?: string
  ) => Promise<{
    success: boolean;
    isAdminBypass?: boolean;
    redirectUrl?: string;
    message?: string;
    phone?: string;
    email?: string;
    target?: string;
    warning?: string;
    cooldownSeconds?: number;
    error?: string;
  }>;
  verifyOtp: (
    identifier: string,
    otp: string,
    firebaseVerified?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithFirebase: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginAsDevRole: (role: UserRole, customEmail?: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
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
  loginWithFirebase: async () => ({ success: false }),
  forgotPassword: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  loginAsDevRole: async () => {},
  logout: () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch verified user and roles securely from HttpOnly cookie via /api/auth/me
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password?: string, turnstileToken?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Login failed' };
      }

      await refreshSession();
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
    phone?: string,
    turnstileToken?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, phone, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Account creation failed' };
      }

      await refreshSession();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (identifier: string, turnstileToken?: string) => {
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, phone: identifier, turnstileToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Failed to send verification code',
        };
      }

      if (data.isAdminBypass) {
        await refreshSession();
        return {
          success: true,
          isAdminBypass: true,
          redirectUrl: data.redirectUrl || '/admin',
          message: data.message,
        };
      }

      return {
        success: true,
        message: data.message,
        phone: data.phone || data.target,
        email: data.email || data.target,
        target: data.target || data.email || data.phone,
        warning: data.warning,
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
        body: JSON.stringify({ identifier, phone: identifier, otp, firebaseVerified }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Verification failed' };
      }

      await refreshSession();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFirebase = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Authentication failed' };
      }

      await refreshSession();
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
        return { success: false, error: data.error || data.message || 'Password reset request failed' };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Password update failed' };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const loginAsDevRole = async (role: UserRole, customEmail?: string) => {
    const isDemoEnabled =
      process.env.NODE_ENV !== 'production' &&
      (process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true' || process.env.ENABLE_DEMO_ACCOUNTS === 'true');

    if (!isDemoEnabled) {
      console.warn('Demo accounts are disabled or not permitted.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/dev-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email: customEmail }),
      });

      if (res.ok) {
        await refreshSession();
      }
    } catch (err) {
      console.warn('Dev token minting unavailable', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('shopsell_user');
      localStorage.removeItem('shopsell_roles');
    }
  };

  const rawRoles = (user?.roles || ['customer']) as UserRole[];
  const isCustomer = rawRoles.includes('customer');
  const isSeller = rawRoles.includes('owner');
  const isAdmin = rawRoles.includes('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        roles: rawRoles,
        isLoading,
        isCustomer,
        isSeller,
        isAdmin,
        token: null, // HttpOnly cookie manages token; not exposed to JS
        login,
        signup,
        sendOtp,
        verifyOtp,
        loginWithFirebase,
        forgotPassword,
        resetPassword,
        loginAsDevRole,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
