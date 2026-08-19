'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { ConfirmModal } from '../components/confirm-modal';
import { Pagination } from '../components/pagination';
import { Card, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function CategoriesContent() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch events for filter dropdown
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=50`, { credentials: 'include' });
        if (res.ok) { const d = await res.json(); setEvents(d.data); }
      } catch {}
    }
    loadEvents();
  }, []);

  const fetchCategories = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (eventFilter) params.set('eventId', eventFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/admin/categories?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load categories.');
      const data = await res.json();
      setCategories(data.data);
      setPagination(data.pagination);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [search, eventFilter, statusFilter]);

  useEffect(() => { fetchCategories(1); }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/categories/${deleteTarget.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Unable to delete.'); }
      setDeleteTarget(null); fetchCategories(pagination.page);
    } catch (err: any) { setDeleteError(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Categories</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">Manage event categories</p>
        </div>
        <Link href="/categories/new"><Button size="sm">CREATE CATEGORY</Button></Link>
      </div>

      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-sm text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40 transition-colors" />
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[140px]">
            <option value="">All Events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[120px]">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </Card>

      {error && <p className="font-sans text-sm text-red-400">{error}</p>}

      {loading ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6"><div className="space-y-4 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-4"><div className="h-4 w-1/4 bg-luxury-gray-border/15 rounded" /><div className="h-4 w-1/6 bg-luxury-gray-border/15 rounded" /><div className="h-4 w-1/5 bg-luxury-gray-border/15 rounded" /></div>)}</div></Card>
      ) : categories.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">No categories yet</p>
          <Link href="/categories/new"><Button size="sm" variant="outline">CREATE CATEGORY</Button></Link>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-luxury-gray-border/10">
                {['Category', 'Code', 'Event', 'Status', 'Rounds', 'Reg.', 'Actions'].map((h) => (
                  <th key={h} className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors">
                    <td className="font-sans text-xs text-luxury-white/80 py-3 px-4 pl-6 font-medium">{cat.name}</td>
                    <td className="font-sans text-[11px] text-luxury-gold/60 py-3 px-4">{cat.code}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">{cat.event.name}</td>
                    <td className="py-3 px-4"><span className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${cat.status === 'ACTIVE' ? 'text-green-400' : 'text-luxury-white/30'}`}>{cat.status}</span></td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">{cat._count.rounds}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">{cat._count.registrations}</td>
                    <td className="py-3 px-4 pr-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/categories/${cat.id}/edit`)} className="font-sans text-[10px] tracking-luxury text-luxury-white/40 hover:text-luxury-gold uppercase font-bold transition-colors">EDIT</button>
                        <button onClick={() => setDeleteTarget(cat)} className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors">DELETE</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4"><Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => fetchCategories(p)} /></div>
        </Card>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Category?" message={deleteError || `Are you sure you want to delete "${deleteTarget?.name}"?`} onConfirm={handleDelete} onCancel={() => { setDeleteTarget(null); setDeleteError(''); }} loading={deleting} />
    </div>
  );
}

export default function CategoriesPage() {
  return <AuthGuard><AdminShell><CategoriesContent /></AdminShell></AuthGuard>;
}
