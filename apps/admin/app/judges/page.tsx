'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { ConfirmModal } from '../components/confirm-modal';
import { Pagination } from '../components/pagination';
import { Card, Button, Input } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function JudgesContent() {
  const router = useRouter();
  const [judges, setJudges] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [targetJudge, setTargetJudge] = useState<any>(null);
  const [actionType, setActionType] = useState<'disable' | 'enable' | 'reset' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [tempPasswordModal, setTempPasswordModal] = useState<{ open: boolean; password: string }>({
    open: false,
    password: '',
  });

  // Load events for filter
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

  // Load categories for filter
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

  const fetchJudges = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (search) params.set('search', search);
        if (eventFilter) params.set('eventId', eventFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);
        if (statusFilter) params.set('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

        const res = await fetch(`${API}/admin/judges?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load judges.');
        const data = await res.json();
        setJudges(data.data);
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
    fetchJudges(1);
  }, [fetchJudges]);

  const handleActionConfirm = async () => {
    if (!targetJudge || !actionType) return;
    setActionLoading(true);
    setActionError('');
    try {
      let endpoint = '';
      if (actionType === 'disable') endpoint = `${API}/admin/judges/${targetJudge.id}/disable`;
      if (actionType === 'enable') endpoint = `${API}/admin/judges/${targetJudge.id}/enable`;
      if (actionType === 'reset') endpoint = `${API}/admin/judges/${targetJudge.id}/reset-password`;

      const res = await fetch(endpoint, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Action failed.');
      }

      const result = await res.json();

      if (actionType === 'reset' && result.temporaryPassword) {
        setTempPasswordModal({ open: true, password: result.temporaryPassword });
      }

      setActionType(null);
      setTargetJudge(null);
      fetchJudges(pagination.page);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Judges</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Accounts, round assignments & access control
          </p>
        </div>
        <Link href="/judges/new">
          <Button size="sm">CREATE JUDGE</Button>
        </Link>
      </div>

      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by Judge Name or Email..."
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[120px]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
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
      ) : judges.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">NO JUDGES YET</p>
          <Link href="/judges/new">
            <Button size="sm" variant="outline">
              CREATE JUDGE
            </Button>
          </Link>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Judge Name', 'Email', 'Assigned Event', 'Category', 'Round', 'Status', 'Reset Req.', 'Actions'].map(
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
                {judges.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors"
                  >
                    <td className="font-sans text-xs text-luxury-white/90 py-3 px-4 pl-6 font-medium">{j.name}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">{j.email}</td>
                    <td className="font-sans text-[11px] text-luxury-white/60 py-3 px-4">{j.event?.name}</td>
                    <td className="font-sans text-[11px] text-luxury-gold/70 py-3 px-4">{j.category?.name}</td>
                    <td className="font-sans text-[11px] text-luxury-white/70 py-3 px-4">{j.round?.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                          j.isActive ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {j.isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                          j.mustResetPassword ? 'text-yellow-500' : 'text-luxury-white/40'
                        }`}
                      >
                        {j.mustResetPassword ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 pr-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/judges/${j.id}`)}
                          className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:text-luxury-white uppercase font-bold transition-colors"
                        >
                          VIEW
                        </button>
                        <button
                          onClick={() => {
                            setTargetJudge(j);
                            setActionType('reset');
                          }}
                          className="font-sans text-[10px] tracking-luxury text-luxury-white/40 hover:text-luxury-gold uppercase font-bold transition-colors"
                        >
                          RESET
                        </button>
                        {j.isActive ? (
                          <button
                            onClick={() => {
                              setTargetJudge(j);
                              setActionType('disable');
                            }}
                            className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors"
                          >
                            DISABLE
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetJudge(j);
                              setActionType('enable');
                            }}
                            className="font-sans text-[10px] tracking-luxury text-green-400/80 hover:text-green-400 uppercase font-bold transition-colors"
                          >
                            ENABLE
                          </button>
                        )}
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
              onPageChange={(p) => fetchJudges(p)}
            />
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!actionType}
        title={
          actionType === 'reset'
            ? 'RESET JUDGE PASSWORD?'
            : actionType === 'disable'
            ? 'DISABLE JUDGE ACCOUNT?'
            : 'ENABLE JUDGE ACCOUNT?'
        }
        message={
          actionError ||
          (actionType === 'reset'
            ? `Are you sure you want to reset password for "${targetJudge?.name}"? A new temporary password will be generated and shown ONCE.`
            : actionType === 'disable'
            ? `Judge "${targetJudge?.name}" will immediately lose access to the Judge scoring portal.`
            : `Judge "${targetJudge?.name}" will be granted access to the scoring portal.`)
        }
        confirmLabel={actionType === 'reset' ? 'RESET PASSWORD' : actionType === 'disable' ? 'DISABLE' : 'ENABLE'}
        onConfirm={handleActionConfirm}
        onCancel={() => {
          setActionType(null);
          setTargetJudge(null);
          setActionError('');
        }}
        loading={actionLoading}
      />

      {/* One-Time Temporary Password Display Modal */}
      {tempPasswordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
              New Temporary Password
            </h3>
            <p className="font-sans text-xs text-luxury-white/50 leading-relaxed">
              A temporary password was generated. Provide this credential to the judge. The judge will be forced to change it on their first login.
            </p>
            <div className="p-4 bg-black border border-luxury-gold/30 text-center">
              <span className="font-mono text-lg font-bold text-luxury-gold tracking-wider select-all">
                {tempPasswordModal.password}
              </span>
            </div>
            <p className="font-sans text-[11px] text-yellow-500/80 text-center">
              ⚠️ Warning: This password will NOT be displayed again.
            </p>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setTempPasswordModal({ open: false, password: '' })}
              >
                DONE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgesPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <JudgesContent />
      </AdminShell>
    </AuthGuard>
  );
}
