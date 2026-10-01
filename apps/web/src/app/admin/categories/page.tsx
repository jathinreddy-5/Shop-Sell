'use client';

import React from 'react';
import { FolderTree } from 'lucide-react';

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Categories & Schemas
        </h1>
        <p className="text-xs text-slate-500">
          Configure marketplace taxonomy and attribute validation schemas.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <FolderTree className="h-6 w-6 text-purple-600" />
          <div>
            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              Taxonomy Hierarchy
            </span>
            <span className="text-xs text-slate-400">Electronics, Fashion, Home & Living, Gourmet.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
