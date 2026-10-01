'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Shield, Mail, User as UserIcon, Calendar } from 'lucide-react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function AccountProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <LoadingThreeDotsJumping label="Loading personal information" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <UserIcon className="h-5 w-5 text-indigo-600" />
            <div>
              <span className="block text-xs text-slate-400">Full Name</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {user?.user_metadata?.full_name || 'Valued Customer'}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <Mail className="h-5 w-5 text-indigo-600" />
            <div>
              <span className="block text-xs text-slate-400">Email Address</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {user?.email || 'customer@shopsell.test'}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-600" />
            <div>
              <span className="block text-xs text-slate-400">Active Roles</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase">
                {user?.roles?.join(', ') || 'customer'}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <div>
              <span className="block text-xs text-slate-400">Account Status</span>
              <span className="text-sm font-semibold text-emerald-600">
                Verified & Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
