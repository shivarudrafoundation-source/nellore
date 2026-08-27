'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-luxury-white/40', UPCOMING: 'text-blue-400', ACTIVE: 'text-green-400',
  COMPLETED: 'text-luxury-gold', CANCELLED: 'text-red-400',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EventDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`${API}/admin/events/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load event.');
        setEvent(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-luxury-gray-border/10 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-luxury-gray-border/10 rounded" />)}
        </div>
      </div>
    );
  }

  if (error || !event) {
    return <p className="font-sans text-sm text-red-400">{error || 'Event not found.'}</p>;
  }

  const tabs = [
    { key: 'overview', label: 'OVERVIEW' },
    { key: 'categories', label: 'CATEGORIES' },
    { key: 'rounds', label: 'ROUNDS' },
    { key: 'registrations', label: 'REGISTRATIONS' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">{event.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-sans text-[11px] text-luxury-gold/60 tracking-luxury">{event.code}</span>
            <span className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${STATUS_COLORS[event.status]}`}>
              {event.status}
            </span>
          </div>
        </div>
        <Link href={`/events/${id}/edit`}>
          <Button size="sm" variant="outline">EDIT EVENT</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Categories', value: event._count.categories },
          { label: 'Registrations', value: event._count.registrations },
          { label: 'Contestants', value: event._count.contestants },
          { label: 'Judges', value: event._count.judges },
        ].map((s) => (
          <Card key={s.label} hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4 text-center">
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase block font-bold">{s.label}</span>
            <span className="font-serif text-2xl font-light text-luxury-white">{s.value}</span>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-luxury-gray-border/10 flex gap-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 font-sans text-[10px] tracking-luxury uppercase font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-luxury-gold border-luxury-gold'
                : 'text-luxury-white/30 border-transparent hover:text-luxury-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
            <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">Event Details</h4>
            <div className="space-y-3">
              {[
                { label: 'Location', value: event.location },
                { label: 'Start Date', value: formatDate(event.startDate) },
                { label: 'End Date', value: formatDate(event.endDate) },
                { label: 'Registration Open', value: event.registrationOpenDate ? formatDate(event.registrationOpenDate) : 'Not set' },
                { label: 'Registration Close', value: event.registrationCloseDate ? formatDate(event.registrationCloseDate) : 'Not set' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury">{item.label}</span>
                  <span className="font-sans text-xs text-luxury-white/70">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
            <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">Description</h4>
            <p className="font-sans text-xs text-luxury-white/50 leading-relaxed">{event.description}</p>
          </Card>
        </div>
      )}

      {activeTab === 'categories' && (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">Categories</h4>
            <Link href={`/categories/new?eventId=${id}`}>
              <Button size="sm" variant="outline">ADD CATEGORY</Button>
            </Link>
          </div>
          {event.categories && event.categories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-luxury-gray-border/10">
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Name</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Code</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Status</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">Rounds</th>
                    <th className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2">Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {event.categories.map((cat: any) => (
                    <tr key={cat.id} className="border-b border-luxury-gray-border/5">
                      <td className="font-sans text-xs text-luxury-white/70 py-2.5 pr-4">{cat.name}</td>
                      <td className="font-sans text-[11px] text-luxury-gold/60 py-2.5 pr-4">{cat.code}</td>
                      <td className="font-sans text-[10px] tracking-luxury uppercase font-bold text-luxury-white/40 py-2.5 pr-4">{cat.status}</td>
                      <td className="font-sans text-[11px] text-luxury-white/50 py-2.5 pr-4 text-center">{cat._count.rounds}</td>
                      <td className="font-sans text-[11px] text-luxury-white/50 py-2.5 text-center">{cat._count.registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-luxury-gray-border/20">
              <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">No categories yet</span>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'rounds' && (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 text-center py-12">
          <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
            Rounds are managed from the Rounds section. Navigate via the sidebar.
          </span>
        </Card>
      )}

      {activeTab === 'registrations' && (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 text-center py-12">
          <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
            Coming in Phase 2C
          </span>
        </Card>
      )}
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <EventDetailContent />
      </AdminShell>
    </AuthGuard>
  );
}
