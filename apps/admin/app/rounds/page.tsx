'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { ConfirmModal } from '../components/confirm-modal';
import { Pagination } from '../components/pagination';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-luxury-white/40',
  ACTIVE: 'text-green-400',
  COMPLETED: 'text-luxury-gold',
  LOCKED: 'text-red-400',
};

function RoundsContent() {
  const router = useRouter();
  const [rounds, setRounds] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [endRoundTarget, setEndRoundTarget] = useState<any>(null);
  const [endingRound, setEndingRound] = useState(false);
  const [endRoundError, setEndRoundError] = useState<any>(null);
  const [endRoundSuccess, setEndRoundSuccess] = useState<any>(null);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=100`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data);
        }
      } catch {}
    }
    loadEvents();
  }, []);

  // Load categories when eventFilter changes
  useEffect(() => {
    async function loadCategories() {
      try {
        const url = eventFilter
          ? `${API}/admin/categories?eventId=${eventFilter}&limit=100`
          : `${API}/admin/categories?limit=100`;
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setCategories(d.data);
        }
      } catch {}
    }
    loadCategories();
  }, [eventFilter]);

  const fetchRounds = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (search) params.set('search', search);
        if (eventFilter) params.set('eventId', eventFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`${API}/admin/rounds?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load rounds.');
        const data = await res.json();
        setRounds(data.data);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [search, eventFilter, categoryFilter, statusFilter],
  );

  useEffect(() => {
    fetchRounds(1);
  }, [fetchRounds]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/rounds/${deleteTarget.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to delete round.');
      }
      setDeleteTarget(null);
      fetchRounds(pagination.page);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEndRound = async () => {
    if (!endRoundTarget) return;
    setEndingRound(true);
    setEndRoundError(null);
    setEndRoundSuccess(null);
    try {
      const res = await fetch(`${API}/admin/rounds/${endRoundTarget.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setEndRoundError(data);
        return;
      }
      setEndRoundSuccess(data);
      fetchRounds(pagination.page);
    } catch (err: any) {
      setEndRoundError({ message: 'ROUND CANNOT BE ENDED YET', error: err.message });
    } finally {
      setEndingRound(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Rounds</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Manage category competition rounds & criteria
          </p>
        </div>
        <Link href="/rounds/new">
          <Button size="sm">CREATE ROUND</Button>
        </Link>
      </div>

      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search rounds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-sm text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40 transition-colors"
          />
          <select
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setCategoryFilter('');
            }}
            className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[140px]"
          >
            <option value="">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[140px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.event?.name ? `(${c.event.name})` : ''}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[120px]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>
      </Card>

      {error && <p className="font-sans text-sm text-red-400">{error}</p>}

      {loading ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6">
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-1/4 bg-luxury-gray-border/15 rounded" />
                <div className="h-4 w-1/6 bg-luxury-gray-border/15 rounded" />
                <div className="h-4 w-1/5 bg-luxury-gray-border/15 rounded" />
              </div>
            ))}
          </div>
        </Card>
      ) : rounds.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">No rounds yet</p>
          <Link href="/rounds/new">
            <Button size="sm" variant="outline">
              CREATE ROUND
            </Button>
          </Link>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Round Name', 'Event', 'Category', 'Day', 'Order', 'Max Marks', 'Judges', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => (
                  <tr
                    key={round.id}
                    className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors"
                  >
                    <td className="font-sans text-xs text-luxury-white/80 py-3 px-4 pl-6 font-medium">{round.name}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">
                      {round.category?.event?.name || '—'}
                    </td>
                    <td className="font-sans text-[11px] text-luxury-gold/60 py-3 px-4">{round.category?.name}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">Day {round.day}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">#{round.sortOrder}</td>
                    <td className="font-sans text-[11px] text-luxury-white/70 py-3 px-4 text-center font-bold">
                      {round.maxMarks}
                    </td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">
                      {round.judgesRequired}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                          STATUS_COLORS[round.status] || 'text-luxury-white/40'
                        }`}
                      >
                        {round.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 pr-6">
                      <div className="flex items-center gap-2">
                        {round.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setEndRoundTarget(round);
                              setEndRoundError(null);
                              setEndRoundSuccess(null);
                            }}
                            className="font-sans text-[10px] tracking-luxury text-yellow-400 hover:text-yellow-300 uppercase font-bold transition-colors bg-yellow-400/10 border border-yellow-400/30 px-2 py-1"
                          >
                            END ROUND
                          </button>
                        )}
                        {round.status === 'COMPLETED' && (
                          <span className="font-sans text-[9px] tracking-luxury text-luxury-gold uppercase font-bold">
                            ROUND COMPLETED
                          </span>
                        )}
                        <button
                          onClick={() => router.push(`/rounds/${round.id}/edit`)}
                          className="font-sans text-[10px] tracking-luxury text-luxury-white/40 hover:text-luxury-gold uppercase font-bold transition-colors"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => setDeleteTarget(round)}
                          className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors"
                        >
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(p) => fetchRounds(p)}
            />
          </div>
        </Card>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Round?"
        message={
          deleteError ||
          `Are you sure you want to delete "${deleteTarget?.name}"? Destructive deletion cannot proceed if scores or judge assignments exist.`
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError('');
        }}
        loading={deleting}
      />

      {/* Phase 6F: End Round Confirmation & Diagnostics Modal */}
      {endRoundTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/50 max-w-lg w-full p-6 space-y-6">
            <div>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
                END THIS ROUND?
              </h3>
              <p className="font-sans text-xs text-luxury-white/50 tracking-luxury uppercase mt-1">
                {endRoundTarget.name} • {endRoundTarget.category?.name}
              </p>
            </div>

            <div className="p-4 bg-black border border-luxury-gray-border/20 text-xs text-luxury-white/70 space-y-2">
              <p>
                Once ended, the round standings will be finalized and Judges will no longer be able to submit normal scores for this round.
              </p>
            </div>

            {endRoundError && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 space-y-2 text-left">
                <p className="font-sans text-xs font-bold text-red-400 tracking-wider uppercase">
                  {endRoundError.message || 'ROUND CANNOT BE ENDED YET'}
                </p>
                {endRoundError.totalContestants !== undefined && (
                  <div className="text-[11px] font-mono text-luxury-white/80 space-y-1">
                    <div>Total Contestants: {endRoundError.totalContestants}</div>
                    <div>Completed Scores: {endRoundError.completedScores} / {endRoundError.totalRequiredScores || (endRoundError.completedScores + endRoundError.remainingScores)}</div>
                    <div className="text-red-400 font-bold">Remaining Scores: {endRoundError.remainingScores}</div>
                  </div>
                )}
                {endRoundError.error && typeof endRoundError.error === 'string' && (
                  <p className="text-[10px] text-red-300/80">{endRoundError.error}</p>
                )}
              </div>
            )}

            {endRoundSuccess && (
              <div className="p-4 bg-green-950/40 border border-green-500/40 text-center space-y-2">
                <p className="font-sans text-xs font-bold text-green-400 tracking-wider uppercase">
                  ROUND COMPLETED
                </p>
                <p className="text-[11px] text-luxury-white/70">
                  Authoritative standings calculated for {endRoundSuccess.totalContestants} contestants.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEndRoundTarget(null);
                  setEndRoundError(null);
                  setEndRoundSuccess(null);
                }}
                disabled={endingRound}
              >
                {endRoundSuccess ? 'CLOSE' : 'CANCEL'}
              </Button>
              {!endRoundSuccess && (
                <Button
                  size="sm"
                  onClick={handleEndRound}
                  disabled={endingRound}
                >
                  {endingRound ? 'ENDING ROUND...' : 'CONFIRM & END ROUND'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function RoundsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <RoundsContent />
      </AdminShell>
    </AuthGuard>
  );
}
