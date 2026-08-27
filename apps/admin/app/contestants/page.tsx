'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Pagination } from '../components/pagination';
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
                      <td className="py-3 px-4 pr-6">
                        <button
                          onClick={() => router.push(`/contestants/${c.id}`)}
                          className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:text-luxury-white uppercase font-bold transition-colors"
                        >
                          VIEW PROFILE
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
