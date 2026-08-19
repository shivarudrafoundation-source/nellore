'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CategoryFormProps {
  initialData?: {
    eventId?: string;
    name?: string;
    code?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  };
  categoryId?: string;
  mode: 'create' | 'edit';
}

export function CategoryForm({ initialData, categoryId, mode }: CategoryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get('eventId') || initialData?.eventId || '';

  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    eventId: preselectedEventId,
    name: initialData?.name || '',
    code: initialData?.code || '',
    description: initialData?.description || '',
    status: initialData?.status || 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=100`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data);
          if (!form.eventId && d.data.length > 0) {
            setForm((prev) => ({ ...prev, eventId: d.data[0].id }));
          }
        }
      } catch {}
    }
    loadEvents();
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.eventId) errs.eventId = 'Event is required.';
    if (!form.name.trim()) errs.name = 'Category name is required.';
    if (!form.code.trim()) errs.code = 'Category code is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const url = mode === 'create' ? `${API}/admin/categories` : `${API}/admin/categories/${categoryId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const body: any = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        status: form.status,
      };
      if (mode === 'create') {
        body.eventId = form.eventId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to save category.');
      }

      router.push('/categories');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="font-sans text-sm text-red-400">{error}</p>
        </div>
      )}

      {mode === 'create' ? (
        <div>
          <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
            Event *
          </label>
          <select
            value={form.eventId}
            onChange={(e) => update('eventId', e.target.value)}
            className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
          >
            <option value="">Select Event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          {fieldErrors.eventId && <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.eventId}</span>}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Category Name *"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={fieldErrors.name}
          placeholder="e.g. Miss, Mrs, Mr, Teen, Kids, Custom"
        />
        <Input
          label="Category Code *"
          value={form.code}
          onChange={(e) => update('code', e.target.value)}
          error={fieldErrors.code}
          placeholder="e.g. MS, MRS, MR, T, K"
        />
      </div>

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="w-full bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 py-2 transition-colors outline-none placeholder:text-luxury-gray/40 resize-none"
          placeholder="Category description, age criteria or guidelines..."
        />
      </div>

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => update('status', e.target.value)}
          className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'SAVING...' : mode === 'create' ? 'CREATE CATEGORY' : 'SAVE CATEGORY'}
        </Button>
        <Button type="button" variant="text" onClick={() => router.back()}>
          CANCEL
        </Button>
      </div>
    </form>
  );
}
