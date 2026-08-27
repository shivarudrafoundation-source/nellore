'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function ContestantDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contestant, setContestant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchContestant() {
      try {
        const res = await fetch(`${API}/admin/contestants/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load contestant.');
        const d = await res.json();
        setContestant(d);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchContestant();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-8 w-64 bg-luxury-gray-border/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-luxury-gray-border/10 rounded" />
          <div className="h-48 bg-luxury-gray-border/10 rounded" />
        </div>
      </div>
    );
  }

  if (error || !contestant) {
    return <p className="font-sans text-sm text-red-400">{error || 'Contestant not found.'}</p>;
  }

  const base = contestant.registration?.baseFields || {};
  const custom = contestant.registration?.customFields || {};

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">{base.name || 'Contestant'}</h2>
            <span className="font-mono text-xs px-2.5 py-1 bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold font-bold">
              {contestant.id}
            </span>
          </div>
          <p className="font-sans text-xs text-luxury-white/40 tracking-luxury uppercase mt-1">
            {contestant.registration?.category?.name} • {contestant.event?.name}
          </p>
        </div>

        {contestant.registration?.id && (
          <Link href={`/registrations/${contestant.registration.id}`}>
            <Button size="sm" variant="outline">
              VIEW REGISTRATION RECORD ↗
            </Button>
          </Link>
        )}
      </div>

      {/* Grid: Competition info & Personal details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Competition Placement
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Event', value: contestant.event?.name },
              { label: 'Event Code', value: contestant.event?.code },
              { label: 'Location', value: contestant.event?.location },
              { label: 'Category', value: contestant.registration?.category?.name },
              { label: 'Category Code', value: contestant.registration?.category?.code },
              {
                label: 'Assigned Date',
                value: new Date(contestant.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
              },
            ].map((item) => (
              <div key={item.label} className="flex justify-between">
                <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury">
                  {item.label}
                </span>
                <span className="font-sans text-xs text-luxury-white/80 font-medium">{item.value || '—'}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Contestant Profile (Admin-Only View)
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Full Name', value: base.name },
              { label: 'Mobile Number', value: contestant.mobile || base.mobile },
              { label: 'Email Address', value: base.email },
              { label: 'Location / City', value: base.location },
              { label: 'Gender', value: base.gender },
              { label: 'Age', value: base.age },
              { label: 'Date of Birth', value: base.dob },
            ].map((item) => (
              <div key={item.label} className="flex justify-between">
                <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury">
                  {item.label}
                </span>
                <span className="font-sans text-xs text-luxury-white/80 font-medium">{item.value || '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Scores Table */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
        <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
          Logged Round Evaluations
        </h4>
        {contestant.scores && contestant.scores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Round', 'Day', 'Judge', 'Score Value', 'Status', 'Submitted At'].map((h) => (
                    <th key={h} className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contestant.scores.map((sc: any) => (
                  <tr key={sc.id} className="border-b border-luxury-gray-border/5">
                    <td className="font-sans text-xs text-luxury-white/90 py-2.5 pr-4">{sc.round?.name}</td>
                    <td className="font-sans text-[11px] text-luxury-white/40 py-2.5 pr-4">Day {sc.round?.day}</td>
                    <td className="font-sans text-[11px] text-luxury-gold/70 py-2.5 pr-4">{sc.judge?.name || 'Admin'}</td>
                    <td className="font-mono text-xs font-bold text-luxury-gold py-2.5 pr-4">
                      {sc.value} / {sc.round?.maxMarks} pts
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`font-sans text-[9px] tracking-luxury uppercase font-bold ${
                          sc.locked ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {sc.locked ? 'LOCKED' : 'SUBMITTED'}
                      </span>
                    </td>
                    <td className="font-sans text-[11px] text-luxury-white/40 py-2.5 whitespace-nowrap">
                      {new Date(sc.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-luxury-gray-border/20">
            <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
              No evaluation scores logged yet for this contestant
            </span>
          </div>
        )}
      </Card>

      <div className="pt-4">
        <Button variant="text" onClick={() => router.push('/contestants')}>
          ← BACK TO CONTESTANTS
        </Button>
      </div>
    </div>
  );
}

export default function ContestantDetailPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <ContestantDetailContent />
      </AdminShell>
    </AuthGuard>
  );
}
