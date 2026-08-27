'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { Button, Input, Card, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function CreateJudgeContent() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);

  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [createdResult, setCreatedResult] = useState<{
    judge: any;
    temporaryPassword: string;
  } | null>(null);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=100`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data);
          if (d.data.length > 0) {
            setSelectedEventId(d.data[0].id);
          }
        }
      } catch {}
    }
    loadEvents();
  }, []);

  // Load categories for selected event
  useEffect(() => {
    async function loadCategories() {
      if (!selectedEventId) {
        setCategories([]);
        setSelectedCategoryId('');
        return;
      }
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${selectedEventId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          setCategories(d.data);
          if (d.data.length > 0) {
            setSelectedCategoryId(d.data[0].id);
          } else {
            setSelectedCategoryId('');
          }
        }
      } catch {}
    }
    loadCategories();
  }, [selectedEventId]);

  // Load rounds for selected category
  useEffect(() => {
    async function loadRounds() {
      if (!selectedCategoryId) {
        setRounds([]);
        setSelectedRoundId('');
        return;
      }
      try {
        const res = await fetch(`${API}/admin/rounds?categoryId=${selectedCategoryId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          setRounds(d.data);
          if (d.data.length > 0) {
            setSelectedRoundId(d.data[0].id);
          } else {
            setSelectedRoundId('');
          }
        }
      } catch {}
    }
    loadRounds();
  }, [selectedCategoryId]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Judge name is required.';
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email address is required.';
    if (!selectedEventId) errs.eventId = 'Event assignment is required.';
    if (!selectedCategoryId) errs.categoryId = 'Category assignment is required.';
    if (!selectedRoundId) errs.roundId = 'Round assignment is required.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/admin/judges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          eventId: selectedEventId,
          categoryId: selectedCategoryId,
          roundId: selectedRoundId,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to create judge.');
      }

      const result = await res.json();
      setCreatedResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Create Judge Account</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Register judge credentials and configure competition assignment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="font-sans text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label="Judge Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            placeholder="e.g. Smt. Meenakshi Sundaram"
          />
          <Input
            label="Official Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="judge@sivarudrafoundation.com"
          />
        </div>

        {/* Dependent Assignment Hierarchy Dropdowns */}
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/30 p-6 space-y-6">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Judge Competition Assignment Hierarchy
          </h4>

          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              1. Event *
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
            >
              <option value="">Select Event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code})
                </option>
              ))}
            </select>
            {fieldErrors.eventId && (
              <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.eventId}</span>
            )}
          </div>

          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              2. Category *
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={categories.length === 0}
              className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none disabled:opacity-30"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.categoryId}</span>
            )}
          </div>

          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              3. Round *
            </label>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              disabled={rounds.length === 0}
              className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none disabled:opacity-30"
            >
              <option value="">Select Round</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Day {r.day} — Max {r.maxMarks} pts)
                </option>
              ))}
            </select>
            {fieldErrors.roundId && (
              <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.roundId}</span>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-4 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'GENERATING ACCOUNT...' : 'CREATE JUDGE ACCOUNT'}
          </Button>
          <Button type="button" variant="text" onClick={() => router.back()}>
            CANCEL
          </Button>
        </div>
      </form>

      {/* One-Time Temporary Password Display Modal */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/50 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
              Judge Account Created!
            </h3>
            <p className="font-sans text-xs text-luxury-white/60 leading-relaxed">
              Account generated for <span className="text-luxury-white font-bold">{createdResult.judge.name}</span> ({createdResult.judge.email}).
            </p>
            <div className="space-y-2">
              <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                Generated Temporary Password
              </span>
              <div className="p-4 bg-black border border-luxury-gold/30 text-center">
                <span className="font-mono text-lg font-bold text-luxury-gold tracking-wider select-all">
                  {createdResult.temporaryPassword}
                </span>
              </div>
            </div>
            <p className="font-sans text-[11px] text-yellow-500/80 text-center">
              ⚠️ Warning: This password will NOT be displayed again. Please copy and provide it to the judge.
            </p>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => router.push('/judges')}>
                PROCEED TO JUDGES LIST
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateJudgePage() {
  return (
    <AuthGuard>
      <AdminShell>
        <CreateJudgeContent />
      </AdminShell>
    </AuthGuard>
  );
}
