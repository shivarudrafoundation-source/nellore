'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminShell } from '../../../components/admin-shell';
import { EventForm } from '../../../components/event-form';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function toLocalDatetime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function EditEventContent() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`${API}/admin/events/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load event.');
        const data = await res.json();
        setEvent(data);
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
      <div className="space-y-4 animate-pulse max-w-2xl">
        {[...Array(6)].map((_, i) => <div key={i} className="h-11 bg-luxury-gray-border/10 rounded" />)}
      </div>
    );
  }

  if (error || !event) {
    return <p className="font-sans text-sm text-red-400">{error || 'Event not found.'}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Edit Event</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">{event.name}</p>
      </div>
      <EventForm
        mode="edit"
        eventId={id}
        initialData={{
          name: event.name,
          code: event.code,
          description: event.description,
          location: event.location,
          startDate: toLocalDatetime(event.startDate),
          endDate: toLocalDatetime(event.endDate),
          logoUrl: event.logoUrl || '',
          registrationOpenDate: toLocalDatetime(event.registrationOpenDate),
          registrationCloseDate: toLocalDatetime(event.registrationCloseDate),
          status: event.status,
        }}
      />
    </div>
  );
}

export default function EditEventPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <EditEventContent />
      </AdminShell>
    </AuthGuard>
  );
}
