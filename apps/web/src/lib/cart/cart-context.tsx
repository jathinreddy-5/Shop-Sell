'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { LoginPromptModal } from '@/components/auth/login-prompt-modal';

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  store: string;
  price: number;
  qty: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  addToCart: (item: CartItem) => boolean;
  updateQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isLoginPromptOpen: boolean;
  openLoginPrompt: (productName?: string) => void;
  closeLoginPrompt: () => void;
  promptProductName: string | null;
}

const defaultCartItems: CartItem[] = [
  {
    id: '44444444-0001-0000-0000-000000000000',
    name: 'Organic Noise-Cancelling Headphones',
    slug: 'organic-noise-cancelling-headphones-1',
    store: 'Apex Tech India',
    price: 3499,
    qty: 1,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
  },
  {
    id: '44444444-0002-0000-0000-000000000000',
    name: 'Ergonomic Mechanical Keyboard',
    slug: 'ergonomic-mechanical-keyboard-2',
    store: 'Apex Tech India',
    price: 699,
    qty: 2,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
  },
];

const CartContext = createContext<CartContextType>({
  items: [],
  cartCount: 0,
  subtotal: 0,
  addToCart: () => false,
  updateQty: () => {},
  removeItem: () => {},
  clearCart: () => {},
  isLoginPromptOpen: false,
  openLoginPrompt: () => {},
  closeLoginPrompt: () => {},
  promptProductName: null,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [promptProductName, setPromptProductName] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sync cart from localStorage when user is logged in
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (user?.sub) {
      const storageKey = `shopsell_cart_${user.sub}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        } catch {
          setItems(defaultCartItems);
        }
      } else {
        // If first login, initialize with default items
        setItems(defaultCartItems);
        localStorage.setItem(storageKey, JSON.stringify(defaultCartItems));
      }
    } else {
      // Guest: Cart is empty until logged in
      setItems([]);
    }
    setHasInitialized(true);
  }, [user?.sub]);

  // Persist items to localStorage when they change (only if logged in)
  useEffect(() => {
    if (!hasInitialized || typeof window === 'undefined') return;
    if (user?.sub) {
      const storageKey = `shopsell_cart_${user.sub}`;
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, user?.sub, hasInitialized]);

  const openLoginPrompt = useCallback((productName?: string) => {
    setPromptProductName(productName || null);
    setIsLoginPromptOpen(true);
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setIsLoginPromptOpen(false);
    setPromptProductName(null);
  }, []);

  const addToCart = useCallback(
    (item: CartItem): boolean => {
      if (!user) {
        // Unauthenticated: ask to log in first!
        openLoginPrompt(item.name);
        return false;
      }

      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.id === item.id || (i.slug && item.slug && i.slug === item.slug)
        );
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: updated[existingIdx].qty + (item.qty || 1),
          };
          return updated;
        }
        return [...prev, { ...item, qty: item.qty || 1 }];
      });

      return true;
    },
    [user, openLoginPrompt]
  );

  const updateQty = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (user?.sub && typeof window !== 'undefined') {
      localStorage.removeItem(`shopsell_cart_${user.sub}`);
    }
  }, [user?.sub]);

  const cartCount = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        subtotal,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        isLoginPromptOpen,
        openLoginPrompt,
        closeLoginPrompt,
        promptProductName,
      }}
    >
      {children}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={closeLoginPrompt}
        productName={promptProductName}
      />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
