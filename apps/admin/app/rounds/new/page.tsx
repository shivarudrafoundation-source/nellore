'use client';

import React, { Suspense } from 'react';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { RoundForm } from '../../components/round-form';

function CreateRoundContent() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Create Competition Round</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Define round parameters, judge quotas, and scoring breakdown
        </p>
      </div>
      <RoundForm mode="create" />
    </div>
  );
}

export default function CreateRoundPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <Suspense fallback={<div className="text-luxury-white/40 text-xs">Loading...</div>}>
          <CreateRoundContent />
        </Suspense>
      </AdminShell>
    </AuthGuard>
  );
}
