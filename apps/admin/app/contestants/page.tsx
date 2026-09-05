'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Pagination } from '../components/pagination';
import { ConfirmModal } from '../components/confirm-modal';
import { Card, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function ContestantsContent() {
  const router = useRouter();
  const [contestants, setContestants] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Edit Contestant ID State
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editIdInput, setEditIdInput] = useState('');
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const generateSuggestedIdForContestant = (c: any, type: 'standard' | 'short' | 'clean_num' = 'standard') => {
    if (!c) return '';
    const catCode = (c.registration?.category?.code || 'GEN').toUpperCase().trim();
    let mapped = catCode;
    if (catCode === 'K' || catCode.includes('KID')) mapped = 'KIDS';
    else if (catCode === 'T' || catCode.includes('TEEN')) mapped = 'TEEN';
    else if (catCode === 'MISS' || catCode.includes('MISS')) mapped = 'MISS';
    else if (catCode === 'MS' || catCode === 'MRS' || catCode.includes('MS')) mapped = 'MS';
    else if (catCode === 'MR' || catCode.includes('MR')) mapped = 'MR';

    const randSeq = String(Math.floor(100 + Math.random() * 900));
    if (type === 'standard') return `SRF-NLR26-${mapped}-${randSeq}`;
    if (type === 'short') return `SRF-${mapped}-${randSeq}`;
    if (type === 'clean_num') return `${mapped}-${randSeq}`;
    return `SRF-${mapped}-${randSeq}`;
  };

  const handleUpdateIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const cleanId = editIdInput.trim().toUpperCase();
    if (!cleanId) {
      setEditError('Please enter a new Contestant ID.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API}/admin/contestants/${editTarget.id}/update-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newContestantId: cleanId,
          password: editPasswordInput.trim() || undefined,
          notifyEmail: notifyCustomer,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || 'Failed to update Contestant ID.');
      }

      setEditTarget(null);
      setActionSuccessMessage(d.message || `Contestant ID updated to "${cleanId}" successfully!`);
      fetchContestants(pagination.page);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/contestants/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to delete contestant.');
      }
      setDeleteTarget(null);
      fetchContestants(pagination.page);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

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

  const fetchContestants = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (search) params.set('search', search);
        if (eventFilter) params.set('eventId', eventFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);

        const res = await fetch(`${API}/admin/contestants?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load contestants.');
        const data = await res.json();
        setContestants(data.data);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [search, eventFilter, categoryFilter],
  );

  useEffect(() => {
    fetchContestants(1);
  }, [fetchContestants]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Contestants</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Verified participants assigned official competitor IDs
          </p>
        </div>
        <Link
          href="/contestants/new"
          className="inline-flex items-center justify-center h-10 px-6 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300"
        >
          + Create Contestant
        </Link>
      </div>

      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by Contestant ID, Name, Mobile..."
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
                {c.name}
              </option>
            ))}
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
      ) : contestants.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">NO CONTESTANTS YET</p>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Contestant ID', 'Name', 'Category', 'Event', 'Payment', 'Scores Logged', 'Assigned Date', 'Actions'].map(
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
                {contestants.map((c) => {
                  const base = c.registration?.baseFields || {};
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors"
                    >
                      <td className="font-mono text-xs font-bold text-luxury-gold py-3 px-4 pl-6">{c.id}</td>
                      <td className="font-sans text-xs text-luxury-white/90 py-3 px-4 font-medium">
                        {base.name || 'Anonymous'}
                      </td>
                      <td className="font-sans text-[11px] text-luxury-gold/70 py-3 px-4">
                        {c.registration?.category?.name || '—'}
                      </td>
                      <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">{c.event?.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-sans text-[10px] tracking-luxury uppercase font-bold text-green-400">
                          {c.registration?.paymentStatus || 'PAID'}
                        </span>
                      </td>
                      <td className="font-sans text-[11px] text-luxury-white/60 py-3 px-4 text-center">
                        {c._count.scores} score{c._count.scores !== 1 ? 's' : ''}
                      </td>
                      <td className="font-sans text-[11px] text-luxury-white/40 py-3 px-4 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 pr-6 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditTarget(c);
                            setEditIdInput(c.id);
                            setEditPasswordInput('');
                            setEditError('');
                            setNotifyCustomer(true);
                          }}
                          className="px-2.5 py-1 bg-luxury-gold/10 hover:bg-luxury-gold hover:text-black text-luxury-gold font-sans text-[10px] tracking-luxury uppercase font-bold border border-luxury-gold/30 rounded-sm transition-all duration-200"
                        >
                          ✏️ EDIT ID
                        </button>
                        <button
                          onClick={() => router.push(`/contestants/${c.id}`)}
                          className="font-sans text-[10px] tracking-luxury text-luxury-white/70 hover:text-luxury-white uppercase font-bold transition-colors ml-1"
                        >
                          PROFILE →
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(c);
                            setDeleteError('');
                          }}
                          className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors ml-1"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(p) => fetchContestants(p)}
            />
          </div>
        </Card>
      )}

      {/* EDIT CONTESTANT ID MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] border-2 border-luxury-gold/60 w-full max-w-lg p-6 space-y-5 shadow-[0_0_50px_rgba(212,175,55,0.15)] rounded-sm relative my-8">
            <div className="flex justify-between items-start border-b border-luxury-gray-border/20 pb-3">
              <div>
                <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                  ADMINISTRATIVE OVERRIDE
                </span>
                <h3 className="font-serif text-xl font-light text-white mt-1">
                  Edit Contestant ID
                </h3>
                <span className="font-sans text-xs text-white/50 block">
                  {editTarget.registration?.baseFields?.name || 'Contestant'} • Current ID: <strong className="font-mono text-luxury-gold">{editTarget.id}</strong>
                </span>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-white/40 hover:text-white text-xl font-sans"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3">
                <p className="font-sans text-xs text-red-400">{editError}</p>
              </div>
            )}

            <form onSubmit={handleUpdateIdSubmit} className="space-y-5">
              {/* Contestant ID Input */}
              <div className="space-y-2">
                <label className="font-sans text-xs font-semibold text-white/80 uppercase tracking-wider block">
                  New Contestant ID <span className="text-luxury-gold">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editIdInput}
                    onChange={(e) => setEditIdInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="e.g. SRF-MR-001 or SRF-NLR26-MR-0001"
                    className="flex-1 h-10 bg-black border border-luxury-gray-border/40 px-3 font-mono text-sm font-bold text-luxury-gold uppercase outline-none focus:border-luxury-gold tracking-wider"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditIdInput(generateSuggestedIdForContestant(editTarget, 'standard'))}
                    className="text-[10px] font-mono px-2 py-1 bg-luxury-gold/10 hover:bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30 rounded"
                  >
                    Standard: {generateSuggestedIdForContestant(editTarget, 'standard')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIdInput(generateSuggestedIdForContestant(editTarget, 'short'))}
                    className="text-[10px] font-mono px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 rounded"
                  >
                    Short: {generateSuggestedIdForContestant(editTarget, 'short')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIdInput(generateSuggestedIdForContestant(editTarget, 'clean_num'))}
                    className="text-[10px] font-mono px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 rounded"
                  >
                    Number: {generateSuggestedIdForContestant(editTarget, 'clean_num')}
                  </button>
                </div>
              </div>

              {/* Optional Password Override */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-sans text-xs font-semibold text-white/80 uppercase tracking-wider">
                    New Portal Password <span className="text-white/40 font-normal lowercase">(optional — leave blank to keep current)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPasswordInput(generateRandomPassword())}
                    className="text-[10px] font-sans text-luxury-gold hover:underline uppercase tracking-wider"
                  >
                    🎲 Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPasswordInput}
                    onChange={(e) => setEditPasswordInput(e.target.value)}
                    placeholder="Leave blank to keep existing password"
                    className="w-full h-10 bg-black border border-luxury-gray-border/40 px-3 pr-10 font-mono text-sm text-white outline-none focus:border-luxury-gold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-mono"
                  >
                    {showEditPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {/* Email Notification Checkbox */}
              <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 rounded-sm space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                    className="mt-0.5 accent-[#D4AF37] w-4 h-4 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-sans text-xs text-luxury-gold font-semibold block">
                      Send Email Notification to Contestant
                    </span>
                    <span className="font-sans text-[11px] text-white/70 block mt-0.5">
                      Dispatches official confirmation with the new Contestant ID and login credentials to{' '}
                      <strong className="text-white font-mono">{editTarget.registration?.baseFields?.email || 'contestant email'}</strong>.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 h-10 bg-luxury-gold hover:bg-[#E5C158] text-black font-bold uppercase tracking-wider text-xs shadow-md rounded-sm transition-all"
                >
                  {editLoading ? 'UPDATING ID & DISPATCHING...' : 'SAVE & UPDATE ID ↗'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-5 h-10 border border-white/20 hover:bg-white/5 text-white/80 font-sans text-xs uppercase font-bold rounded-sm transition-all"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="DELETE CONTESTANT?"
        message={
          deleteError ||
          `Are you sure you want to permanently delete contestant "${deleteTarget?.id}" (${deleteTarget?.registration?.baseFields?.name || 'Contestant'})? This will remove all their logged scores.`
        }
        confirmLabel="DELETE CONTESTANT"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError('');
        }}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function ContestantsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <ContestantsContent />
      </AdminShell>
    </AuthGuard>
  );
}
