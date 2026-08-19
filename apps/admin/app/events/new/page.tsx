'use client';

import React from 'react';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { EventForm } from '../../components/event-form';

export default function CreateEventPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Create Event</h2>
            <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">Define a new pageant event</p>
          </div>
          <EventForm mode="create" />
        </div>
      </AdminShell>
    </AuthGuard>
  );
}
