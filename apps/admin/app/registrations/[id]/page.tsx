'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function RegistrationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [contestantIdInput, setContestantIdInput] = useState('');
  const [modalError, setModalError] = useState('');

  const fetchRegistration = async () => {
    try {
      const res = await fetch(`${API}/admin/registrations/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load registration details.');
      const d = await res.json();
      setRegistration(d);
      if (!contestantIdInput) {
        const eventCode = d.event?.code || 'NLR26';
        const catCode = d.category?.code || 'GEN';
        const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
        setContestantIdInput(`SRF-${eventCode}-${catCode}-${randomSeq}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistration();
  }, [id]);

  const handleVerifyPaymentWithId = async (e: React.FormEvent) => {
    e.preventDefault();
    const contestantId = contestantIdInput.trim().toUpperCase();
    if (!contestantId) {
      setModalError('Please enter a Contestant ID.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    setActionMessage('');
    setError('');

    try {
      const res = await fetch(`${API}/admin/registrations/${id}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contestantId }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || 'Unable to verify payment and assign Contestant ID.');
      }

      setRegistration(d.registration || d);
      setModalOpen(false);
      setActionMessage(`Payment verified and Contestant ID "${contestantId}" assigned successfully!`);
    } catch (err: any) {
      setModalError(err.message);
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
              PAYMENT: {registration.paymentStatus === 'PAID' ? 'VERIFIED' : 'PENDING'}
            </span>
            <span
              className={`font-sans text-[10px] tracking-luxury uppercase font-bold px-2 py-0.5 border ${
                registration.contestantId
                  ? 'border-luxury-gold/30 text-luxury-gold bg-luxury-gold/5'
                  : 'border-luxury-white/15 text-luxury-white/40'
              }`}
            >
              CONTESTANT: {registration.contestantId ? 'ACTIVE' : 'NOT ASSIGNED'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {registration.paymentStatus === 'UNPAID' && (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold tracking-wider"
            >
              VERIFY PAYMENT & ASSIGN ID ↗
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
            Applicant Details
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Legal Name', value: base.name },
              { label: 'Email', value: base.email },
              { label: 'Mobile', value: base.mobile },
              { label: 'Location', value: base.location },
              { label: 'Gender', value: base.gender },
              { label: 'Age', value: base.age ? `${base.age} yrs` : null },
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

      {/* VERIFY PAYMENT & ASSIGN CONTESTANT ID MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-6 space-y-5 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gray-border/20 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                PAYMENT VERIFICATION
              </span>
              <h3 className="font-serif text-xl font-light text-white mt-1">
                Assign Contestant ID & Activate
              </h3>
            </div>

            {modalError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
                {modalError}
              </div>
            )}

            <div className="bg-[#050505] border border-white/10 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Applicant:</span>
                <span className="text-white font-medium">{base.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Email:</span>
                <span className="text-white font-mono">{base.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Event:</span>
                <span className="text-white">{registration.event?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Category:</span>
                <span className="text-luxury-gold font-medium">{registration.category?.name}</span>
              </div>
            </div>

            <form onSubmit={handleVerifyPaymentWithId} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1.5">
                  Official Contestant ID *
                </label>
                <input
                  type="text"
                  required
                  value={contestantIdInput}
                  onChange={(e) => setContestantIdInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SRF-NLR26-MISS-0012"
                  className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-luxury-gold font-bold focus:outline-none rounded-sm"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-luxury-gold hover:bg-luxury-gold/80 text-black font-bold uppercase tracking-wider text-xs"
                >
                  {actionLoading ? 'VERIFYING...' : 'CONFIRM & ASSIGN ↗'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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
