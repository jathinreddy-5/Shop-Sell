'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUserPayload, UserRole } from '@shop-sell/shared';

interface AuthContextType {
  user: AuthUserPayload | null;
  roles: UserRole[];
  isLoading: boolean;
  isCustomer: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  token: string | null;
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
  loginAsDevRole: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted token or session on mount
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('shopsell_token') : null;
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('shopsell_user') : null;

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user', err);
      }
    }
    setIsLoading(false);
  }, []);

  const loginAsDevRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const roles: UserRole[] = role === 'owner' ? ['customer', 'owner'] : [role];
      const res = await fetch(`${apiUrl}/api/auth/dev-token`, {
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
        setToken(data.token);
        setUser(userObj);
        localStorage.setItem('shopsell_token', data.token);
        localStorage.setItem('shopsell_user', JSON.stringify(userObj));
      }
    } catch (err) {
      console.warn('Backend not yet reachable for dev-token minting, using client mock state');
      const roles: UserRole[] = role === 'owner' ? ['customer', 'owner'] : [role];
      const mockUser: AuthUserPayload = {
        sub: `dev-${role}-uuid`,
        email: `${role}@shopsell.test`,
        roles,
        user_metadata: { full_name: `Dev ${role.toUpperCase()} User` },
      };
      setUser(mockUser);
      localStorage.setItem('shopsell_user', JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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
        loginAsDevRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
