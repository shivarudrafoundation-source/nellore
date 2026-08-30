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
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [contestantIdInput, setContestantIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

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
      if (!passwordInput) {
        setPasswordInput(generateRandomPassword());
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
    if (!passwordInput.trim()) {
      setModalError('Please enter a password.');
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
        body: JSON.stringify({
          contestantId,
          password: passwordInput.trim(),
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || 'Unable to verify payment and assign Contestant ID.');
      }

      setRegistration(d.registration || d);
      setModalOpen(false);
      setActionMessage(`Payment verified and Contestant ID "${contestantId}" with credentials dispatched to applicant's email!`);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setModalError('Please enter a new password.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    setActionMessage('');

    try {
      const res = await fetch(`${API}/admin/registrations/${id}/resend-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: passwordInput.trim(),
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || 'Unable to dispatch credentials.');
      }

      setResendModalOpen(false);
      setActionMessage(d.message || 'Credentials updated and dispatched to contestant email successfully!');
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

      {/* PAYMENT VERIFICATION & CREDENTIAL MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-6 space-y-5 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gray-border/20 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                PAYMENT VERIFICATION & CREDENTIAL DISPATCH
              </span>
              <h3 className="font-serif text-xl font-light text-white mt-1">
                Assign Contestant ID & Password
              </h3>
            </div>

            {modalError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
                {modalError}
              </div>
            )}

            <form onSubmit={handleVerifyPaymentWithId} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                    Official Contestant ID *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const eventCode = registration.event?.code || 'NLR26';
                      const catCode = registration.category?.code || 'GEN';
                      const randomSeq = String(Math.floor(1000 + Math.random() * 9000));
                      setContestantIdInput(`SRF-${eventCode}-${catCode}-${randomSeq}`);
                    }}
                    className="text-[10px] text-luxury-gold hover:underline font-mono uppercase"
                  >
                    Generate New ID
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={contestantIdInput}
                  onChange={(e) => setContestantIdInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SRF-NLR26-MISS-0012"
                  className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-luxury-gold font-bold focus:outline-none rounded-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                    Contestant Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasswordInput(generateRandomPassword())}
                    className="text-[10px] text-luxury-gold hover:underline font-mono uppercase"
                  >
                    Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter or generate password"
                    className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-white focus:outline-none rounded-sm pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-1 bg-white/5 rounded"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-luxury-gold font-semibold">
                  <span>✉</span>
                  <span>Instant Email Notification</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Upon verification, the <strong>Contestant ID</strong> and <strong>Password</strong> will be dispatched to{' '}
                  <span className="text-white font-mono">{base.email || 'registrant email'}</span> with login URL.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-luxury-gold hover:bg-luxury-gold/80 text-black font-bold uppercase tracking-wider text-xs"
                >
                  {actionLoading ? 'DISPATCHING...' : 'VERIFY & DISPATCH CREDENTIALS ↗'}
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

      {/* RESEND / RESET CREDENTIALS MODAL */}
      {resendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-6 space-y-5 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gray-border/20 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                CREDENTIAL MANAGEMENT
              </span>
              <h3 className="font-serif text-xl font-light text-white mt-1">
                Reset Password & Resend Email
              </h3>
            </div>

            {modalError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
                {modalError}
              </div>
            )}

            <div className="bg-[#050505] border border-white/10 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Contestant ID:</span>
                <span className="text-luxury-gold font-mono font-bold">{registration.contestantId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Recipient Email:</span>
                <span className="text-white font-mono">{base.email || 'N/A'}</span>
              </div>
            </div>

            <form onSubmit={handleResendCredentials} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                    New Portal Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasswordInput(generateRandomPassword())}
                    className="text-[10px] text-luxury-gold hover:underline font-mono uppercase"
                  >
                    Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter or generate password"
                    className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-white focus:outline-none rounded-sm pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-1 bg-white/5 rounded"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-luxury-gold hover:bg-luxury-gold/80 text-black font-bold uppercase tracking-wider text-xs"
                >
                  {actionLoading ? 'DISPATCHING...' : 'UPDATE & SEND EMAIL ↗'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResendModalOpen(false)}
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
