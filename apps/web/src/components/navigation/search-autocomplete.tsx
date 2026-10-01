'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Clock, X, ArrowUpRight, Sparkles } from 'lucide-react';
import { LoadingThreeDotsJumping } from '@/components/loading';

interface AutocompleteProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string;
  category: string;
}

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'wireless earbuds',
    'ceramic mug',
    'cotton shirt',
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [products, setProducts] = useState<AutocompleteProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 150ms Debounced Autocomplete
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setProducts([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      // Mock / fetch autocomplete results
      const q = query.toLowerCase();
      const mockSuggestions = [
        `${q}`,
        `${q} pro`,
        `${q} handcrafted`,
        `${q} in electronics`,
      ];
      setSuggestions(mockSuggestions);

      setProducts([
        {
          id: 'p1',
          name: `${query.charAt(0).toUpperCase() + query.slice(1)} Performance Edition`,
          slug: 'sample-product-slug-1',
          price: 2499,
          thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80',
          category: 'Electronics',
        },
        {
          id: 'p2',
          name: `Artisanal ${query} Natural Clay`,
          slug: 'sample-product-slug-2',
          price: 899,
          thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100&q=80',
          category: 'Home & Kitchen',
        },
      ]);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    executeSearch(query.trim());
  };

  const executeSearch = (searchTerm: string) => {
    if (!recentSearches.includes(searchTerm)) {
      setRecentSearches([searchTerm, ...recentSearches.slice(0, 4)]);
    }
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const removeRecent = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(recentSearches.filter((s) => s !== item));
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search products, brands, and categories..."
          className="w-full rounded-full border border-slate-300 bg-slate-100/70 py-2.5 pl-11 pr-10 text-sm outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
        />
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-3 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Section A: Empty box shows Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Recent Searches</span>
                <button
                  onClick={() => setRecentSearches([])}
                  className="hover:text-rose-500"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    onClick={() => executeSearch(item)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item}</span>
                    </div>
                    <button
                      onClick={(e) => removeRecent(item, e)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B & C: Query suggestions & Product matches */}
          {query && (
            isSearching ? (
              <div className="flex items-center justify-center py-6">
                <LoadingThreeDotsJumping size={10} jumpHeight={16} gap={6} label="Searching catalog" />
              </div>
            ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Query suggestions */}
              <div className="space-y-1 border-r border-slate-100 pr-2 dark:border-slate-800">
                <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Suggestions
                </span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => executeSearch(s)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span>{s}</span>
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  </button>
                ))}
              </div>

              {/* Matching products with thumbnail & price */}
              <div className="space-y-2">
                <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Products
                </span>
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        {p.name}
                      </div>
                      <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{p.price.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
