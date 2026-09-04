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
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code?: string; eventId: string }>>([]);

  const [selectedEventId, setSelectedEventId] = useState(initialData?.eventId || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialData?.categoryId || '');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialData?.categoryId ? [initialData.categoryId] : [],
  );

  const [name, setName] = useState(initialData?.name || '');
  const [maxMarks, setMaxMarks] = useState<number | string>(initialData?.maxMarks ?? 50);
  const [scoredBy, setScoredBy] = useState(initialData?.scoredBy || 'judge');
  const [day, setDay] = useState<number | string>(initialData?.day ?? 1);
  const [sortOrder, setSortOrder] = useState<number | string>(initialData?.sortOrder ?? 1);
  const [judgesRequired, setJudgesRequired] = useState<number | string>(initialData?.judgesRequired ?? 3);
  const [status, setStatus] = useState(initialData?.status || 'DRAFT');

  const [criteria, setCriteria] = useState<Criterion[]>(
    initialData?.subCriteria && Array.isArray(initialData.subCriteria) && initialData.subCriteria.length > 0
      ? initialData.subCriteria
      : [
          { name: 'Presentation', description: 'Overall presentation and posture', maxMarks: 15, order: 1 },
          { name: 'Walk & Poise', description: 'Ramp walk technique and poise', maxMarks: 15, order: 2 },
          { name: 'Confidence', description: 'Stage presence and vocal confidence', maxMarks: 10, order: 3 },
          { name: 'Attire & Styling', description: 'Relevance and styling precision', maxMarks: 10, order: 4 },
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
          setEvents(d.data || []);
          if (!selectedEventId && d.data && d.data.length > 0 && mode === 'create') {
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
        setSelectedCategoryIds([]);
        return;
      }
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${selectedEventId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          const list = d.data || [];
          setCategories(list);
          if (list.length > 0) {
            if (mode === 'create') {
              // Pre-select all categories by default for high convenience
              setSelectedCategoryIds(list.map((c: any) => c.id));
              setSelectedCategoryId(list[0].id);
            } else {
              if (!list.some((c: any) => c.id === selectedCategoryId)) {
                setSelectedCategoryId(list[0].id);
              }
            }
          } else {
            setSelectedCategoryId('');
            setSelectedCategoryIds([]);
          }
        }
      } catch {}
    }
    loadCategories();
  }, [selectedEventId, mode]);

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  const selectAllCategories = () => {
    setSelectedCategoryIds(categories.map((c) => c.id));
  };

  const clearAllCategories = () => {
    setSelectedCategoryIds([]);
  };

  const isAllSelected = categories.length > 0 && selectedCategoryIds.length === categories.length;

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        name: `Criterion ${prev.length + 1}`,
        description: '',
        maxMarks: 10,
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
    if (mode === 'create' && selectedCategoryIds.length === 0) {
      errs.categoryId = 'At least one Category must be selected.';
    }
    if (mode === 'edit' && !selectedCategoryId) {
      errs.categoryId = 'Category is required.';
    }
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
        body.categoryIds = selectedCategoryIds;
      } else {
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

      {mode === 'create' ? (
        <div className="space-y-6">
          {/* Event Selector */}
          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
              Event *
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setSelectedCategoryIds([]);
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

          {/* Multi-Category Selection with Select All Option */}
          <div className="border border-luxury-gold/30 bg-[#080808] p-5 rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-luxury-gold/20 pb-3">
              <div>
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold font-bold block">
                  Applicable Categories *
                </label>
                <span className="text-[11px] text-white/50 font-sans">
                  Select all categories where this round will take place (or select individual categories).
                </span>
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    className={`px-3 py-1 text-xs font-mono uppercase font-bold rounded transition-colors ${
                      isAllSelected
                        ? 'bg-luxury-gold text-black shadow-sm'
                        : 'bg-luxury-gold/20 text-luxury-gold hover:bg-luxury-gold/30 border border-luxury-gold/40'
                    }`}
                  >
                    ✓ Select All ({categories.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearAllCategories}
                    className="px-2.5 py-1 text-xs font-mono uppercase text-white/40 hover:text-white/80 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {categories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-2.5 p-3 rounded border cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-luxury-gold/15 border-luxury-gold text-white shadow-sm'
                          : 'bg-black/60 border-luxury-gray-border/30 text-white/60 hover:border-luxury-gold/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container click
                        className="w-4 h-4 rounded border-luxury-gold text-luxury-gold focus:ring-0 accent-[#D4AF37] cursor-pointer"
                      />
                      <div className="text-left min-w-0">
                        <span className="font-sans text-xs font-bold block truncate">
                          {cat.name}
                        </span>
                        {cat.code && (
                          <span className="font-mono text-[9px] text-luxury-gold/80 block">
                            Code: {cat.code}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/40 italic py-2">
                {selectedEventId ? 'No active categories found for this event. Please create categories first.' : 'Please select an event above.'}
              </p>
            )}

            {selectedCategoryIds.length > 0 && (
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-luxury-gold border-t border-white/5">
                <span>
                  ✓ {selectedCategoryIds.length} of {categories.length} categories selected
                </span>
                <span className="text-white/40">
                  Round will be generated across all selected categories simultaneously.
                </span>
              </div>
            )}

            {fieldErrors.categoryId && (
              <span className="font-sans text-xs text-red-500 block pt-1">{fieldErrors.categoryId}</span>
            )}
          </div>
        </div>
      ) : (
        /* Edit Mode: Single Category Selector */
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Round Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder="e.g. Traditional Wear, Talent Round, Q&A"
        />

        <div>
          <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
            Scored By *
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Input
          label="Day Number *"
          type="number"
          min="1"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          error={fieldErrors.day}
          placeholder="e.g. 1, 2"
        />

        <Input
          label="Round Order / Sequence *"
          type="number"
          min="1"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          error={fieldErrors.sortOrder}
          placeholder="e.g. 1, 2, 3"
        />

        <Input
          label="Judges Required *"
          type="number"
          min="1"
          value={judgesRequired}
          onChange={(e) => setJudgesRequired(e.target.value)}
          error={fieldErrors.judgesRequired}
          placeholder="e.g. 3, 4"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
            Round Maximum Marks *
          </label>
          <input
            type="number"
            min="1"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            placeholder="e.g. 50, 100"
            className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
          />
          {fieldErrors.maxMarks && (
            <span className="font-sans text-xs text-red-500 mt-0.5 block">{fieldErrors.maxMarks}</span>
          )}
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

      {/* Sub-Criteria Configuration */}
      <Card hoverEffect={false} className="p-6 space-y-6 bg-black/60 border-luxury-gold/30">
        <div className="flex items-center justify-between border-b border-luxury-gold/20 pb-4">
          <div>
            <h3 className="font-serif text-lg font-light text-luxury-gold">Scoring Criteria Configuration</h3>
            <p className="font-sans text-xs text-luxury-white/50 tracking-luxury">
              Breakdown of evaluation parameters for judges (Criteria sum: {totalCriteriaMarks} / {maxMarks || 0} pts)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCriterion}
            className="text-xs"
          >
            + Add Criterion
          </Button>
        </div>

        <div className="space-y-4">
          {criteria.map((c, idx) => (
            <div
              key={idx}
              className="p-4 bg-luxury-black-obsidian border border-luxury-gray-border/30 rounded-sm space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs uppercase tracking-luxury text-luxury-gold font-bold">
                  Criterion #{idx + 1}
                </span>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCriterion(idx)}
                    className="text-xs text-red-400 hover:text-red-300 uppercase tracking-luxury"
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
                    placeholder="e.g. Poise & Elegance"
                  />
                </div>
                <div>
                  <Input
                    label="Max Marks *"
                    type="number"
                    min="1"
                    value={c.maxMarks}
                    onChange={(e) => updateCriterion(idx, 'maxMarks', e.target.value)}
                    error={fieldErrors[`criterion_${idx}_marks`]}
                    placeholder="25"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans text-[10px] uppercase tracking-luxury text-luxury-white/40 block mb-1">
                  Evaluation Guidance / Description (Optional)
                </label>
                <input
                  type="text"
                  value={c.description}
                  onChange={(e) => updateCriterion(idx, 'description', e.target.value)}
                  placeholder="Guidance for judges on how to score this criterion"
                  className="w-full h-9 bg-black border-b border-luxury-gray-border/40 focus:border-luxury-gold text-luxury-white font-sans text-xs px-2 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-luxury-gray-border/30">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/rounds')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-luxury-gold hover:bg-[#E5C158] text-black font-bold">
          {loading
            ? 'Creating...'
            : mode === 'create'
              ? `Create Round (${selectedCategoryIds.length} ${selectedCategoryIds.length === 1 ? 'Category' : 'Categories'}) ↗`
              : 'Save Round Changes'}
        </Button>
      </div>
    </form>
  );
}
