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
  const [judgeId, setJudgeId] = useState('JUDGE-01');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);

  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [createdResult, setCreatedResult] = useState<{
    judge: any;
    password: string;
    temporaryPassword: string;
  } | null>(null);

  const generateCleanPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const generateAutoJudgeId = (style: 'standard' | 'srf' | 'short' = 'standard') => {
    const randomNum = String(Math.floor(10 + Math.random() * 90));
    if (style === 'srf') {
      return `SRF-JUDGE-${randomNum}`;
    }
    if (style === 'short') {
      return `JDG-${randomNum}`;
    }
    return `JUDGE-${randomNum}`;
  };

  useEffect(() => {
    setPassword(generateCleanPassword());
  }, []);

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
        setSelectedCategoryIds([]);
        return;
      }
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${selectedEventId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          const cats = d.data || [];
          setCategories(cats);
          // By default, select all categories so judge has multi-category access across event
          setSelectedCategoryIds(cats.map((c: any) => c.id));
        }
      } catch {}
    }
    loadCategories();
  }, [selectedEventId]);

  // Load rounds for the first selected category
  useEffect(() => {
    const primaryCatId = selectedCategoryIds[0];
    if (!primaryCatId) {
      setRounds([]);
      setSelectedRoundId('');
      return;
    }
    async function loadRounds() {
      try {
        const res = await fetch(`${API}/admin/rounds?categoryId=${primaryCatId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          const rList = d.data || [];
          setRounds(rList);
          if (rList.length > 0) {
            setSelectedRoundId(rList[0].id);
          } else {
            setSelectedRoundId('');
          }
        }
      } catch {}
    }
    loadRounds();
  }, [selectedCategoryIds]);

  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      if (selectedCategoryIds.length === 1) return; // Keep at least one
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds((prev) => [...prev, catId]);
    }
  };

  const selectAllCategories = () => {
    setSelectedCategoryIds(categories.map((c) => c.id));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Judge name is required.';
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email address is required.';
    if (!judgeId.trim()) errs.judgeId = 'Judge ID is required.';
    if (!password.trim()) errs.password = 'Judge Password is required.';
    if (!selectedEventId) errs.eventId = 'Event assignment is required.';
    if (selectedCategoryIds.length === 0) errs.categoryId = 'At least one Category assignment is required.';

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
          id: judgeId.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          eventId: selectedEventId,
          categoryId: selectedCategoryIds[0],
          categoryIds: selectedCategoryIds,
          roundId: selectedRoundId || undefined,
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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Create Judge Account</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Register judge credentials with multi-category scoring capabilities
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

        {/* Custom / Auto Judge ID and Password Section */}
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/30 p-6 space-y-6">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Judge ID & Login Password Setup (Auto or Manual)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Judge ID */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                  Judge ID *
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-white/40 uppercase">Auto:</span>
                  <button
                    type="button"
                    onClick={() => setJudgeId(generateAutoJudgeId('standard'))}
                    className="text-luxury-gold hover:underline font-mono uppercase"
                    title="JUDGE-XX"
                  >
                    Standard
                  </button>
                  <span className="text-white/20">|</span>
                  <button
                    type="button"
                    onClick={() => setJudgeId(generateAutoJudgeId('srf'))}
                    className="text-luxury-gold hover:underline font-mono uppercase"
                    title="SRF-JUDGE-XX"
                  >
                    SRF
                  </button>
                  <span className="text-white/20">|</span>
                  <button
                    type="button"
                    onClick={() => setJudgeId(generateAutoJudgeId('short'))}
                    className="text-luxury-gold hover:underline font-mono uppercase"
                    title="JDG-XX"
                  >
                    Short
                  </button>
                </div>
              </div>
              <input
                type="text"
                required
                value={judgeId}
                onChange={(e) => setJudgeId(e.target.value.toUpperCase())}
                placeholder="e.g. JUDGE-01, JDG-101"
                className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-luxury-gold font-bold focus:outline-none rounded-sm"
              />
              <span className="block text-[10px] text-white/40 mt-1 font-sans">
                💡 Click auto options or type any custom manual ID.
              </span>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                  Judge Password *
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateCleanPassword())}
                  className="text-[10px] text-luxury-gold hover:underline font-mono uppercase"
                >
                  ⚡ Auto Password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter or generate password"
                  className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-white focus:outline-none rounded-sm pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-1 bg-white/5 rounded"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <span className="block text-[10px] text-white/40 mt-1 font-sans">
                💡 Click generate or type any custom password.
              </span>
            </div>
          </div>
        </Card>

        {/* Multi-Category Assignment Hierarchy */}
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/30 p-6 space-y-6">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Judge Competition Assignment (Multi-Category Support)
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
            <div className="flex items-center justify-between mb-2">
              <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block">
                2. Assigned Categories (Multi-Select) *
              </label>
              <button
                type="button"
                onClick={selectAllCategories}
                className="text-[10px] text-luxury-gold hover:underline uppercase font-mono"
              >
                ✓ Select All Categories
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#050505] border border-luxury-gray-border/30 rounded-sm">
              {categories.map((c) => {
                const isChecked = selectedCategoryIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`flex items-center gap-3 p-2.5 border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-luxury-gold/10 border-luxury-gold/60 text-white'
                        : 'bg-[#111111] border-luxury-gray-border/20 text-white/60 hover:border-luxury-gold/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-luxury-gold h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase font-sans">{c.name}</span>
                      <span className="text-[10px] font-mono text-luxury-gold">{c.code}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            {fieldErrors.categoryId && (
              <span className="font-sans text-xs text-red-500 mt-1 block">{fieldErrors.categoryId}</span>
            )}
            <span className="block text-[10px] text-white/40 mt-1 font-sans">
              💡 The judge will be able to switch between all selected categories inside their scoring portal.
            </span>
          </div>

          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              3. Default Primary Round
            </label>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              disabled={rounds.length === 0}
              className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none disabled:opacity-30"
            >
              <option value="">Auto-assign all judge rounds</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Day {r.day} — Max {r.maxMarks} pts)
                </option>
              ))}
            </select>
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

      {/* Clean Judge Credentials Display Modal */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/50 w-full max-w-md p-8 space-y-6 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gold/30 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                JUDGE ACCOUNT READY
              </span>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide mt-1">
                Judge Account Created!
              </h3>
            </div>

            <p className="font-sans text-xs text-luxury-white/60 leading-relaxed">
              Account created for <span className="text-luxury-white font-bold">{createdResult.judge.name}</span> with multi-category scoring capabilities.
            </p>

            <div className="bg-black/90 border border-luxury-gold/30 p-4 space-y-3 rounded-sm text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/40 uppercase text-[10px]">Judge ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-luxury-gold">{createdResult.judge.id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdResult.judge.id, 'id')}
                    className="text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-0.5 bg-white/5 rounded"
                  >
                    {copiedField === 'id' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/40 uppercase text-[10px]">Official Email:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white/90">{createdResult.judge.email}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdResult.judge.email, 'email')}
                    className="text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-0.5 bg-white/5 rounded"
                  >
                    {copiedField === 'email' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/40 uppercase text-[10px]">Login Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-luxury-gold tracking-wider">
                    {createdResult.password || createdResult.temporaryPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(createdResult.password || createdResult.temporaryPassword, 'pass')
                    }
                    className="text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-0.5 bg-white/5 rounded"
                  >
                    {copiedField === 'pass' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => router.push(`/judges/${createdResult.judge.id}`)}>
                VIEW JUDGE PROFILE →
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
