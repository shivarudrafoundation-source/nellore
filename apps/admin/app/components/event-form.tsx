'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface EventFormData {
  name: string;
  code: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  logoUrl: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  status: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  eventId?: string;
  mode: 'create' | 'edit';
}

export function EventForm({ initialData, eventId, mode }: EventFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<EventFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    logoUrl: initialData?.logoUrl || '',
    registrationOpenDate: initialData?.registrationOpenDate || '',
    registrationCloseDate: initialData?.registrationCloseDate || '',
    status: initialData?.status || 'DRAFT',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Event name is required.';
    if (!form.code.trim()) errs.code = 'Event code is required.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (!form.location.trim()) errs.location = 'Location is required.';
    if (!form.startDate) errs.startDate = 'Start date is required.';
    if (!form.endDate) errs.endDate = 'End date is required.';
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      errs.endDate = 'End date must be after start date.';
    }
    if (form.registrationOpenDate && form.registrationCloseDate &&
        new Date(form.registrationOpenDate) >= new Date(form.registrationCloseDate)) {
      errs.registrationCloseDate = 'Registration close date must be after open date.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const url = mode === 'create' ? `${API}/admin/events` : `${API}/admin/events/${eventId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const body: any = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };

      if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
      if (form.registrationOpenDate) body.registrationOpenDate = form.registrationOpenDate;
      if (form.registrationCloseDate) body.registrationCloseDate = form.registrationCloseDate;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to save event.');
      }

      const result = await res.json();
      router.push(`/events/${result.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof EventFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="font-sans text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input label="Event Name *" value={form.name} onChange={(e) => update('name', e.target.value)} error={fieldErrors.name} placeholder="Siva Rudra Pageant 2026" />
        <Input label="Event Code *" value={form.code} onChange={(e) => update('code', e.target.value)} error={fieldErrors.code} placeholder="SRF-NLR-2026" />
      </div>

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="w-full bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 py-2 transition-colors outline-none placeholder:text-luxury-gray/40 resize-none"
          placeholder="Event description..."
        />
        {fieldErrors.description && <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.description}</span>}
      </div>

      <Input label="Location *" value={form.location} onChange={(e) => update('location', e.target.value)} error={fieldErrors.location} placeholder="Nellore, Andhra Pradesh" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input label="Start Date *" type="datetime-local" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} error={fieldErrors.startDate} />
        <Input label="End Date *" type="datetime-local" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} error={fieldErrors.endDate} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input label="Registration Open Date" type="datetime-local" value={form.registrationOpenDate} onChange={(e) => update('registrationOpenDate', e.target.value)} error={fieldErrors.registrationOpenDate} />
        <Input label="Registration Close Date" type="datetime-local" value={form.registrationCloseDate} onChange={(e) => update('registrationCloseDate', e.target.value)} error={fieldErrors.registrationCloseDate} />
      </div>

      <Input label="Logo URL (Optional)" value={form.logoUrl} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" />

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">Status</label>
        <select
          value={form.status}
          onChange={(e) => update('status', e.target.value)}
          className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
        >
          <option value="DRAFT">Draft</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'SAVING...' : mode === 'create' ? 'CREATE EVENT' : 'SAVE EVENT'}
        </Button>
        <Button type="button" variant="text" onClick={() => router.back()}>
          CANCEL
        </Button>
      </div>
    </form>
  );
}
