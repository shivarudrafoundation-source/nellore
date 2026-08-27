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

interface EventItem {
  id: string;
  name: string;
  code: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { categories: number; registrations: number };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-luxury-white/40',
  UPCOMING: 'text-blue-400',
  ACTIVE: 'text-green-400',
  COMPLETED: 'text-luxury-gold',
  CANCELLED: 'text-red-400',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EventsContent() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchEvents = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/admin/events?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load events.');
      const data = await res.json();
      setEvents(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/events/${deleteTarget.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to delete event.');
      }
      setDeleteTarget(null);
      fetchEvents(pagination.page);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Events</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">Manage pageant events</p>
        </div>
        <Link href="/events/new">
          <Button size="sm">CREATE EVENT</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-sm text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40 transition-colors"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[140px]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <p className="font-sans text-sm text-red-400 tracking-wide">{error}</p>
      )}

      {/* Table */}
      {loading ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6">
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-1/4 bg-luxury-gray-border/15 rounded" />
                <div className="h-4 w-1/6 bg-luxury-gray-border/15 rounded" />
                <div className="h-4 w-1/5 bg-luxury-gray-border/15 rounded" />
                <div className="h-4 w-1/6 bg-luxury-gray-border/15 rounded" />
              </div>
            ))}
          </div>
        </Card>
      ) : events.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
          <p className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">No events yet</p>
          <Link href="/events/new">
            <Button size="sm" variant="outline">CREATE EVENT</Button>
          </Link>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Event Name', 'Code', 'Start', 'End', 'Location', 'Status', 'Cat.', 'Reg.', 'Actions'].map((h) => (
                    <th key={h} className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id} className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors">
                    <td className="font-sans text-xs text-luxury-white/80 py-3 px-4 pl-6 font-medium">{evt.name}</td>
                    <td className="font-sans text-[11px] text-luxury-gold/60 py-3 px-4">{evt.code}</td>
                    <td className="font-sans text-[11px] text-luxury-white/40 py-3 px-4 whitespace-nowrap">{formatDate(evt.startDate)}</td>
                    <td className="font-sans text-[11px] text-luxury-white/40 py-3 px-4 whitespace-nowrap">{formatDate(evt.endDate)}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4">{evt.location}</td>
                    <td className="py-3 px-4">
                      <span className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${STATUS_COLORS[evt.status] || 'text-luxury-white/40'}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">{evt._count.categories}</td>
                    <td className="font-sans text-[11px] text-luxury-white/50 py-3 px-4 text-center">{evt._count.registrations}</td>
                    <td className="py-3 px-4 pr-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/events/${evt.id}`)} className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:text-luxury-white uppercase font-bold transition-colors">VIEW</button>
                        <button onClick={() => router.push(`/events/${evt.id}/edit`)} className="font-sans text-[10px] tracking-luxury text-luxury-white/40 hover:text-luxury-gold uppercase font-bold transition-colors">EDIT</button>
                        <button onClick={() => setDeleteTarget(evt)} className="font-sans text-[10px] tracking-luxury text-red-400/60 hover:text-red-400 uppercase font-bold transition-colors">DELETE</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 pb-4">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={(p) => fetchEvents(p)} />
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Event?"
        message={deleteError || `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be reversed if the event has no dependent records.`}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
        loading={deleting}
      />
    </div>
  );
}

export default function EventsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <EventsContent />
      </AdminShell>
    </AuthGuard>
  );
}
