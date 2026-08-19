'use client';

import React, { Suspense } from 'react';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { CategoryForm } from '../../components/category-form';

function CreateCategoryContent() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Create Category</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Add a competition category to an event
        </p>
      </div>
      <CategoryForm mode="create" />
    </div>
  );
}

export default function CreateCategoryPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <Suspense fallback={<div className="text-luxury-white/40 text-xs">Loading...</div>}>
          <CreateCategoryContent />
        </Suspense>
      </AdminShell>
    </AuthGuard>
  );
}
