'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Pagination } from '../components/pagination';
import { ConfirmModal } from '../components/confirm-modal';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function RegistrationsContent() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Payment Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [enteredContestantId, setEnteredContestantId] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/registrations/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to delete registration.');
      }
      setDeleteTarget(null);
      fetchRegistrations(pagination.page);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

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

  // Load categories when event filter changes
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

  const fetchRegistrations = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (search) params.set('search', search);
        if (eventFilter) params.set('eventId', eventFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);
        if (paymentFilter) params.set('paymentStatus', paymentFilter);

        const res = await fetch(`${API}/admin/registrations?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load registrations.');
        const data = await res.json();
        setRegistrations(data.data);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [search, eventFilter, categoryFilter, paymentFilter],
  );

  useEffect(() => {
    fetchRegistrations(1);
  }, [fetchRegistrations]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const generateAutoContestantId = (reg: any, style: 'standard' | 'short' | 'number' = 'standard') => {
    if (!reg) return '';
    const cleanEvent = (reg.event?.code || 'NLR').replace(/^SRF-?/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanCat = (reg.category?.code || 'GEN').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const randomSeq = String(Math.floor(100 + Math.random() * 900));

    if (style === 'short') {
      return `SRF-${cleanCat}-${randomSeq}`;
    }
    if (style === 'number') {
      return `${cleanCat}-${randomSeq}`;
    }
    return cleanEvent ? `SRF-${cleanEvent}-${cleanCat}-${randomSeq}` : `SRF-${cleanCat}-${randomSeq}`;
  };

  const openVerifyModal = (reg: any) => {
    setSelectedReg(reg);
    setEnteredContestantId(generateAutoContestantId(reg, 'standard'));
    setVerifyError('');
    setVerifyModalOpen(true);
  };

  const handleConfirmVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;

    const contestantId = enteredContestantId.trim().toUpperCase();
    if (!contestantId) {
      setVerifyError('Please enter a Contestant ID.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError('');

    try {
      const res = await fetch(`${API}/admin/registrations/${selectedReg.id}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contestantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to verify payment and assign Contestant ID.');
      }

      setVerifyModalOpen(false);
      setSelectedReg(null);
      fetchRegistrations(pagination.page);
    } catch (err: any) {
      setVerifyError(err.message || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Registrations</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Applicant submissions, payment verification & contestant assignment
          </p>
        </div>
      </div>

      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by Name, Mobile, Email, Contestant ID..."
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
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[130px]"
          >
            <option value="">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
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
      ) : registrations.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">NO REGISTRATIONS YET</p>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Name', 'Email', 'Event', 'Category', 'Payment', 'Contestant ID', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => {
                  const base = reg.baseFields || {};
                  return (
                    <tr
                      key={reg.id}
                      className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors"
                    >
                      <td className="font-sans text-xs text-luxury-white/90 py-3 px-4 pl-6 font-medium">
                        {base.name || 'Anonymous'}
                      </td>
                      <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">{base.email || base.mobile || '—'}</td>
                      <td className="font-sans text-[11px] text-luxury-white/60 py-3 px-4">{reg.event?.name}</td>
                      <td className="font-sans text-[11px] text-luxury-gold/60 py-3 px-4">{reg.category?.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                            reg.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-500/80'
                          }`}
                        >
                          {reg.paymentStatus === 'PAID' ? '✓ VERIFIED' : '⏳ PENDING'}
                        </span>
                      </td>
                      <td className="font-sans text-[11px] font-mono text-luxury-gold py-3 px-4">
                        {reg.contestantId ? (
                          <Link href={`/contestants/${reg.contestantId}`} className="hover:underline">
                            {reg.contestantId}
                          </Link>
                        ) : (
                          <span className="text-luxury-white/20">NOT ASSIGNED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 pr-6 flex items-center gap-2">
                        {reg.paymentStatus === 'UNPAID' && (
                          <button
                            onClick={() => openVerifyModal(reg)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-sans text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors"
                          >
                            VERIFY PAYMENT
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/registrations/${reg.id}`)}
                          className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:text-luxury-white uppercase font-bold transition-colors ml-1"
                        >
                          DETAILS →
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(reg);
                            setDeleteError('');
                          }}
                          className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors ml-2"
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
              onPageChange={(p) => fetchRegistrations(p)}
            />
          </div>
        </Card>
      )}

      {/* PAYMENT VERIFICATION MODAL */}
      {verifyModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-6 space-y-5 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gray-border/20 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                ADMIN PAYMENT VERIFICATION
              </span>
              <h3 className="font-serif text-xl font-light text-white mt-1">
                Confirm & Assign Contestant ID
              </h3>
            </div>

            {verifyError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
                {verifyError}
              </div>
            )}

            <div className="bg-[#050505] border border-white/10 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Applicant:</span>
                <span className="text-white font-medium">{selectedReg.baseFields?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Email:</span>
                <span className="text-white font-mono">{selectedReg.baseFields?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Event:</span>
                <span className="text-white">{selectedReg.event?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Category:</span>
                <span className="text-luxury-gold font-medium">{selectedReg.category?.name}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmVerify} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                    Contestant ID (Auto or Manual) *
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-white/40 uppercase">Auto:</span>
                    <button
                      type="button"
                      onClick={() => setEnteredContestantId(generateAutoContestantId(selectedReg, 'standard'))}
                      className="text-luxury-gold hover:underline font-mono uppercase"
                      title="Standard: SRF-NLR-K-101"
                    >
                      Full
                    </button>
                    <span className="text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => setEnteredContestantId(generateAutoContestantId(selectedReg, 'short'))}
                      className="text-luxury-gold hover:underline font-mono uppercase"
                      title="Short: SRF-K-101"
                    >
                      Short
                    </button>
                    <span className="text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => setEnteredContestantId(generateAutoContestantId(selectedReg, 'number'))}
                      className="text-luxury-gold hover:underline font-mono uppercase"
                      title="Simple: K-101"
                    >
                      Simple
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={enteredContestantId}
                  onChange={(e) => setEnteredContestantId(e.target.value.toUpperCase())}
                  placeholder="Type any manual ID (e.g. 101, NLR-01, SRF-K-05)"
                  className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-luxury-gold font-bold focus:outline-none rounded-sm"
                />
                <span className="block text-[10px] text-white/40 mt-1 font-sans">
                  💡 Click auto presets above or directly type any custom manual ID.
                </span>
              </div>

              <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-luxury-gold font-semibold">
                  <span>✉</span>
                  <span>Official Contestant Accreditation</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Upon confirmation, the <strong>Contestant ID</strong> will be officially assigned and an accreditation confirmation email will be dispatched to{' '}
                  <span className="text-white font-mono">{selectedReg.baseFields?.email || 'registrant email'}</span>. The contestant will log in to the portal using their own registered password.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={verifyLoading}
                  className="flex-1 bg-luxury-gold hover:bg-luxury-gold/80 text-black font-bold uppercase tracking-wider text-xs"
                >
                  {verifyLoading ? 'CONFIRMING...' : 'CONFIRM & ASSIGN CONTESTANT ID ↗'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyModalOpen(false)}
                  className="text-xs"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="DELETE REGISTRATION?"
        message={
          deleteError ||
          `Are you sure you want to permanently delete registration for "${deleteTarget?.baseFields?.name || deleteTarget?.id}"? This will also remove any assigned contestant ID and scores.`
        }
        confirmLabel="DELETE REGISTRATION"
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

export default function RegistrationsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <RegistrationsContent />
      </AdminShell>
    </AuthGuard>
  );
}
