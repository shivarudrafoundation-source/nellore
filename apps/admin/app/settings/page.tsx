'use client';

import React from 'react';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Card } from '@srf/ui';

function SettingsContent() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Platform Settings</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          System environment, security policies & orchestrator configurations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Security & Authentication
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Session Management', value: 'HTTPOnly Secure JWT Cookies' },
              { label: 'Judge Blindness', value: 'Strict Isolation Active' },
              { label: 'CSRF / CORS Protection', value: 'Whitelisted Origins Only' },
              { label: 'Audit Trail', value: 'Active Logging' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center text-left">
                <span className="font-sans text-[11px] text-luxury-white/40 uppercase tracking-luxury">
                  {item.label}
                </span>
                <span className="font-sans text-xs text-luxury-white/80 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Database & Infrastructure
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Database Provider', value: 'Supabase PostgreSQL' },
              { label: 'ORM Layer', value: 'Prisma Client' },
              { label: 'API Backend', value: 'NestJS Framework' },
              { label: 'Realtime Gateway', value: 'WebSocket Engine' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center text-left">
                <span className="font-sans text-[11px] text-luxury-white/40 uppercase tracking-luxury">
                  {item.label}
                </span>
                <span className="font-sans text-xs text-luxury-white/80 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <SettingsContent />
      </AdminShell>
    </AuthGuard>
  );
}
