'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Pagination } from '../components/pagination';
import { Card } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
                  {['Name', 'Mobile', 'Event', 'Category', 'Payment', 'Contestant ID', 'Date', 'Actions'].map((h) => (
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
                      <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">{base.mobile || '—'}</td>
                      <td className="font-sans text-[11px] text-luxury-white/60 py-3 px-4">{reg.event?.name}</td>
                      <td className="font-sans text-[11px] text-luxury-gold/60 py-3 px-4">{reg.category?.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                            reg.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-500/80'
                          }`}
                        >
                          {reg.paymentStatus}
                        </span>
                      </td>
                      <td className="font-sans text-[11px] font-mono text-luxury-gold py-3 px-4">
                        {reg.contestantId ? (
                          <Link href={`/contestants/${reg.contestantId}`} className="hover:underline">
                            {reg.contestantId}
                          </Link>
                        ) : (
                          <span className="text-luxury-white/20">—</span>
                        )}
                      </td>
                      <td className="font-sans text-[11px] text-luxury-white/40 py-3 px-4 whitespace-nowrap">
                        {new Date(reg.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 pr-6">
                        <button
                          onClick={() => router.push(`/registrations/${reg.id}`)}
                          className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:text-luxury-white uppercase font-bold transition-colors"
                        >
                          VIEW DETAILS
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
