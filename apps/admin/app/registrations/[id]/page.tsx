'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { Card, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function RegistrationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchRegistration = async () => {
    try {
      const res = await fetch(`${API}/admin/registrations/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load registration details.');
      const d = await res.json();
      setRegistration(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistration();
  }, [id]);

  const handleVerifyPayment = async () => {
    setActionLoading(true);
    setActionMessage('');
    setError('');
    try {
      const res = await fetch(`${API}/admin/registrations/${id}/verify-payment`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to verify payment.');
      }

      const updated = await res.json();
      setRegistration(updated);
      setActionMessage('Payment verified successfully! You may now activate the Contestant account.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateContestant = async () => {
    setActionLoading(true);
    setActionMessage('');
    setError('');
    try {
      const res = await fetch(`${API}/admin/registrations/${id}/create-contestant`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to create contestant.');
      }

      const d = await res.json();
      setRegistration(d.registration || { ...registration, contestantId: d.contestant?.id });
      setActionMessage(`Contestant created & activated successfully! Official ID: ${d.contestant?.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

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

  if (error || !registration) {
    return <p className="font-sans text-sm text-red-400">{error || 'Registration not found.'}</p>;
  }

  const base = registration.baseFields || {};
  const custom = registration.customFields || {};

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
            {base.name || 'Registration Entry'}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="font-mono text-xs text-luxury-white/40">Ref: {registration.id}</span>
            <span
              className={`font-sans text-[10px] tracking-luxury uppercase font-bold px-2 py-0.5 border ${
                registration.paymentStatus === 'PAID'
                  ? 'border-green-500/30 text-green-400 bg-green-500/5'
                  : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'
              }`}
            >
              PAYMENT: {registration.paymentStatus}
            </span>
            <span
              className={`font-sans text-[10px] tracking-luxury uppercase font-bold px-2 py-0.5 border ${
                registration.contestantId
                  ? 'border-luxury-gold/30 text-luxury-gold bg-luxury-gold/5'
                  : 'border-luxury-white/15 text-luxury-white/40'
              }`}
            >
              CONTESTANT: {registration.contestantId ? 'ACTIVE' : 'NOT ACTIVATED'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {registration.paymentStatus === 'UNPAID' && (
            <Button
              size="sm"
              onClick={handleVerifyPayment}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? 'VERIFYING...' : 'VERIFY PAYMENT ↗'}
            </Button>
          )}

          {registration.paymentStatus === 'PAID' && !registration.contestantId && (
            <Button
              size="sm"
              onClick={handleCreateContestant}
              disabled={actionLoading}
              className="bg-luxury-gold hover:bg-luxury-gold/80 text-luxury-black-pure font-bold"
            >
              {actionLoading ? 'CREATING...' : 'CREATE & ACTIVATE CONTESTANT ↗'}
            </Button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="font-sans text-sm text-green-400">{actionMessage}</p>
        </div>
      )}

      {/* Contestant Banner if Assigned */}
      {registration.contestantId && (
        <Card hoverEffect={false} className="bg-luxury-gold/5 border-luxury-gold/30 p-6 flex items-center justify-between">
          <div>
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
              Official Contestant Assigned
            </span>
            <span className="font-mono text-xl font-bold text-luxury-white">{registration.contestantId}</span>
          </div>
          <Link href={`/contestants/${registration.contestantId}`}>
            <Button size="sm" variant="outline">
              VIEW CONTESTANT PROFILE ↗
            </Button>
          </Link>
        </Card>
      )}

      {/* Grid: Event Info & Applicant Base Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Competition Context
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Event', value: registration.event?.name },
              { label: 'Event Code', value: registration.event?.code },
              { label: 'Category', value: registration.category?.name },
              { label: 'Category Code', value: registration.category?.code },
              {
                label: 'Registered On',
                value: new Date(registration.createdAt).toLocaleDateString('en-IN', {
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
            Applicant Details (Private)
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Full Name', value: base.name },
              { label: 'Mobile Number', value: base.mobile },
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

      {/* Custom Fields */}
      {Object.keys(custom).length > 0 && (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
            Custom Questionnaire Responses
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(custom).map(([k, v]) => (
              <div key={k} className="p-3 bg-[#050505] border border-luxury-gray-border/10">
                <span className="font-sans text-[10px] text-luxury-white/40 uppercase tracking-luxury block mb-1">
                  {k}
                </span>
                <span className="font-sans text-xs text-luxury-white/80">{String(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="pt-4">
        <Button variant="text" onClick={() => router.push('/registrations')}>
          ← BACK TO REGISTRATIONS
        </Button>
      </div>
    </div>
  );
}

export default function RegistrationDetailPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <RegistrationDetailContent />
      </AdminShell>
    </AuthGuard>
  );
}
