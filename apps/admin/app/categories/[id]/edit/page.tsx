import { getApiBaseUrl } from '@srf/ui';
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminShell } from '../../../components/admin-shell';
import { CategoryForm } from '../../../components/category-form';

const API = getApiBaseUrl();

function EditCategoryContent() {
  const params = useParams();
  const id = params.id as string;
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCategory() {
      try {
        const res = await fetch(`${API}/admin/categories/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load category.');
        const data = await res.json();
        setCategory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCategory();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-11 bg-luxury-gray-border/10 rounded" />
        ))}
      </div>
    );
  }

  if (error || !category) {
    return <p className="font-sans text-sm text-red-400">{error || 'Category not found.'}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Edit Category</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          {category.name} ({category.event?.name})
        </p>
      </div>
      <CategoryForm
        mode="edit"
        categoryId={id}
        initialData={{
          eventId: category.eventId,
          name: category.name,
          code: category.code,
          description: category.description || '',
          status: category.status,
        }}
      />
    </div>
  );
}

export default function EditCategoryPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <EditCategoryContent />
      </AdminShell>
    </AuthGuard>
  );
}
