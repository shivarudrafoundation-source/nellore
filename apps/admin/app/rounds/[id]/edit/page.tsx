'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminShell } from '../../../components/admin-shell';
import { RoundForm } from '../../../components/round-form';
import { getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function EditRoundContent() {
  const params = useParams();
  const id = params.id as string;
  const [round, setRound] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchRound() {
      try {
        const res = await fetch(`${API}/admin/rounds/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load round.');
        const data = await res.json();
        setRound(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRound();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-11 bg-luxury-gray-border/10 rounded" />
        ))}
      </div>
    );
  }

  if (error || !round) {
    return <p className="font-sans text-sm text-red-400">{error || 'Round not found.'}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Edit Round</h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          {round.name} ({round.category?.name})
        </p>
      </div>
      <RoundForm
        mode="edit"
        roundId={id}
        initialData={{
          categoryId: round.categoryId,
          name: round.name,
          day: round.day,
          maxMarks: round.maxMarks,
          status: round.status,
          sortOrder: round.sortOrder,
          subCriteria: round.criteria || [],
        }}
      />
    </div>
  );
}

export default function EditRoundPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <EditRoundContent />
      </AdminShell>
    </AuthGuard>
  );
}
