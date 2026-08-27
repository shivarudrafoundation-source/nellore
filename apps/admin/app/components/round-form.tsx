'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

interface Criterion {
  name: string;
  description: string;
  maxMarks: number;
  order: number;
}

interface RoundFormProps {
  initialData?: {
    eventId?: string;
    categoryId?: string;
    name?: string;
    maxMarks?: number;
    scoredBy?: string;
    day?: number;
    sortOrder?: number;
    judgesRequired?: number;
    status?: string;
    subCriteria?: Criterion[];
  };
  roundId?: string;
  mode: 'create' | 'edit';
}

export function RoundForm({ initialData, roundId, mode }: RoundFormProps) {
  const router = useRouter();

  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; eventId: string }>>([]);

  const [selectedEventId, setSelectedEventId] = useState(initialData?.eventId || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialData?.categoryId || '');

  const [name, setName] = useState(initialData?.name || '');
  const [maxMarks, setMaxMarks] = useState<number | string>(initialData?.maxMarks ?? 100);
  const [scoredBy, setScoredBy] = useState(initialData?.scoredBy || 'judge');
  const [day, setDay] = useState<number | string>(initialData?.day ?? 1);
  const [sortOrder, setSortOrder] = useState<number | string>(initialData?.sortOrder ?? 1);
  const [judgesRequired, setJudgesRequired] = useState<number | string>(initialData?.judgesRequired ?? 3);
  const [status, setStatus] = useState(initialData?.status || 'DRAFT');

  const [criteria, setCriteria] = useState<Criterion[]>(
    initialData?.subCriteria && Array.isArray(initialData.subCriteria) && initialData.subCriteria.length > 0
      ? initialData.subCriteria
      : [
          { name: 'Presentation', description: 'Overall presentation and posture', maxMarks: 25, order: 1 },
          { name: 'Walk & Poise', description: 'Ramp walk technique and poise', maxMarks: 25, order: 2 },
          { name: 'Confidence', description: 'Stage presence and vocal confidence', maxMarks: 25, order: 3 },
          { name: 'Attire & Styling', description: 'Relevance and styling precision', maxMarks: 25, order: 4 },
        ],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=100`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data);
          if (!selectedEventId && d.data.length > 0 && mode === 'create') {
            setSelectedEventId(d.data[0].id);
          }
        }
      } catch {}
    }
    loadEvents();
  }, [mode, selectedEventId]);

  // Load categories for selected event
  useEffect(() => {
    async function loadCategories() {
      if (!selectedEventId) {
        setCategories([]);
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
            // Keep selected if exists in list, else set to first
            if (!d.data.some((c: any) => c.id === selectedCategoryId)) {
              setSelectedCategoryId(d.data[0].id);
            }
          } else {
            setSelectedCategoryId('');
          }
        }
      } catch {}
    }
    loadCategories();
  }, [selectedEventId]);

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        name: `Criterion ${prev.length + 1}`,
        description: '',
        maxMarks: 25,
        order: prev.length + 1,
      },
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, key: keyof Criterion, val: any) => {
    setCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const totalCriteriaMarks = criteria.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedEventId) errs.eventId = 'Event is required.';
    if (!selectedCategoryId) errs.categoryId = 'Category is required.';
    if (!name.trim()) errs.name = 'Round name is required.';
    if (!maxMarks || Number(maxMarks) <= 0) errs.maxMarks = 'Max marks must be > 0.';
    if (!day || Number(day) <= 0) errs.day = 'Day must be > 0.';
    if (!sortOrder || Number(sortOrder) <= 0) errs.sortOrder = 'Order must be > 0.';
    if (!judgesRequired || Number(judgesRequired) <= 0) errs.judgesRequired = 'Judges required must be > 0.';

    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name.trim()) {
        errs[`criterion_${i}_name`] = 'Name required';
      }
      if (!criteria[i].maxMarks || Number(criteria[i].maxMarks) <= 0) {
        errs[`criterion_${i}_marks`] = 'Marks > 0 required';
      }
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
      const url = mode === 'create' ? `${API}/admin/rounds` : `${API}/admin/rounds/${roundId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const body: any = {
        name: name.trim(),
        maxMarks: Number(maxMarks),
        scoredBy,
        day: Number(day),
        sortOrder: Number(sortOrder),
        judgesRequired: Number(judgesRequired),
        status,
        subCriteria: criteria.map((c, idx) => ({
          name: c.name.trim(),
          description: c.description.trim(),
          maxMarks: Number(c.maxMarks),
          order: idx + 1,
        })),
      };

      if (mode === 'create') {
        body.eventId = selectedEventId;
        body.categoryId = selectedCategoryId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to save round.');
      }

      router.push('/rounds');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="font-sans text-sm text-red-400">{error}</p>
        </div>
      )}

      {mode === 'create' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              Event *
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setSelectedCategoryId('');
              }}
              className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
            >
              <option value="">Select Event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {fieldErrors.eventId && (
              <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.eventId}</span>
            )}
          </div>

          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              Category *
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.categoryId}</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Round Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder="e.g. Traditional Wear, Talent Round, Q&A"
        />
        <Input
          label="Maximum Marks *"
          type="number"
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
          error={fieldErrors.maxMarks}
          placeholder="100"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Input
          label="Day Number *"
          type="number"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          error={fieldErrors.day}
          placeholder="1"
        />
        <Input
          label="Round Order / Sequence *"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          error={fieldErrors.sortOrder}
          placeholder="1"
        />
        <Input
          label="Judges Required *"
          type="number"
          value={judgesRequired}
          onChange={(e) => setJudgesRequired(e.target.value)}
          error={fieldErrors.judgesRequired}
          placeholder="3"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
            Scored By
          </label>
          <select
            value={scoredBy}
            onChange={(e) => setScoredBy(e.target.value)}
            className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
          >
            <option value="judge">Judge</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
      </div>

      {/* SCORING CRITERIA CONFIGURATION */}
      <div className="space-y-4 pt-4 border-t border-luxury-gray-border/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-light text-luxury-white tracking-wide">
              Scoring Criteria Configuration
            </h3>
            <p className="font-sans text-xs text-luxury-white/40 tracking-luxury uppercase mt-0.5">
              Breakdown of evaluation parameters for judges
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addCriterion}>
            + ADD CRITERION
          </Button>
        </div>

        <div className="space-y-3">
          {criteria.map((c, idx) => (
            <Card key={idx} hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
                  Criterion #{idx + 1}
                </span>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Criterion Name *"
                    value={c.name}
                    onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                    error={fieldErrors[`criterion_${idx}_name`]}
                    placeholder="e.g. Walk & Poise"
                  />
                </div>
                <div>
                  <Input
                    label="Max Marks *"
                    type="number"
                    value={c.maxMarks}
                    onChange={(e) => updateCriterion(idx, 'maxMarks', Number(e.target.value))}
                    error={fieldErrors[`criterion_${idx}_marks`]}
                    placeholder="25"
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Description / Judge Guidance"
                  value={c.description}
                  onChange={(e) => updateCriterion(idx, 'description', e.target.value)}
                  placeholder="Evaluation guidelines for the judge..."
                />
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-luxury-gray-border/20">
          <span className="font-sans text-xs tracking-luxury text-luxury-white/50 uppercase font-bold">
            Total Criteria Marks Sum
          </span>
          <span
            className={`font-mono text-sm font-bold ${
              Number(totalCriteriaMarks) === Number(maxMarks) ? 'text-green-400' : 'text-luxury-gold'
            }`}
          >
            {totalCriteriaMarks} / {maxMarks || 0} pts
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'SAVING...' : mode === 'create' ? 'CREATE ROUND' : 'SAVE ROUND'}
        </Button>
        <Button type="button" variant="text" onClick={() => router.back()}>
          CANCEL
        </Button>
      </div>
    </form>
  );
}
