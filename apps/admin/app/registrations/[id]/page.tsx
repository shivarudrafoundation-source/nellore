'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { ConfirmModal } from '../../components/confirm-modal';
import { Card, Button, ContestantIdCard, getApiBaseUrl } from '@srf/ui';

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

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [contestantIdInput, setContestantIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleDeleteRegistration = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/registrations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to delete registration.');
      }
      router.push('/registrations');
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const generateAutoContestantId = (reg: any, style: 'standard' | 'short' | 'number' = 'standard') => {
    if (!reg) return '';
    const cleanEvent = (reg.event?.code || 'NLR').replace(/^SRF-?/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanCat = (reg.category?.code || 'GEN').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const randomSeq = String(Math.floor(100 + Math.random() * 900));

    if (style === 'short') {
      return `SRF-${cleanCat}-${randomSeq}`;
    }
    if (style === 'number') {
      return `${cleanCat}-${randomSeq}`;
    }
    return cleanEvent ? `SRF-${cleanEvent}-${cleanCat}-${randomSeq}` : `SRF-${cleanCat}-${randomSeq}`;
  };

  const fetchRegistration = async () => {
    try {
      const res = await fetch(`${API}/admin/registrations/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load registration details.');
      const d = await res.json();
      setRegistration(d);
      if (!contestantIdInput) {
        setContestantIdInput(generateAutoContestantId(d, 'standard'));
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
        }),
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

        <div className="flex flex-wrap items-center gap-3">
          {registration.contestantId && registration.paymentStatus === 'PAID' && (
            <Button
              size="sm"
              onClick={() => setIdCardModalOpen(true)}
              className="bg-luxury-gold hover:bg-[#E5C158] text-black font-bold tracking-wider flex items-center gap-1.5 shadow-md"
            >
              <span>🎫</span>
              <span>VIEW & PRINT ID CARD</span>
            </Button>
          )}

          {registration.paymentStatus === 'UNPAID' && (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold tracking-wider"
            >
              VERIFY PAYMENT & ASSIGN ID ↗
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setDeleteError('');
              setDeleteModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider text-xs"
          >
            DELETE REGISTRATION
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="font-sans text-sm text-green-400">{actionMessage}</p>
        </div>
      )}

      {/* Contestant Banner if Assigned */}
      {registration.contestantId && (
        <Card hoverEffect={false} className="bg-luxury-gold/5 border-luxury-gold/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
              Official Contestant Assigned
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-luxury-white">{registration.contestantId}</span>
              {registration.paymentStatus === 'PAID' && (
                <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 font-sans text-[10px] uppercase font-bold">
                  ✓ PAID & ACCREDITED
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setIdCardModalOpen(true)}
              className="bg-luxury-gold text-black font-bold"
            >
              🎫 GENERATE ID CARD
            </Button>
            <Link href={`/contestants/${registration.contestantId}`}>
              <Button size="sm" variant="outline">
                VIEW PROFILE ↗
              </Button>
            </Link>
          </div>
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
                ADMIN PAYMENT VERIFICATION
              </span>
              <h3 className="font-serif text-xl font-light text-white mt-1">
                Confirm & Assign Contestant ID
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
                    Contestant ID (Auto or Manual) *
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-white/40 uppercase">Auto:</span>
                    <button
                      type="button"
                      onClick={() => setContestantIdInput(generateAutoContestantId(registration, 'standard'))}
                      className="text-luxury-gold hover:underline font-mono uppercase"
                      title="Standard: SRF-NLR-K-101"
                    >
                      Full
                    </button>
                    <span className="text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => setContestantIdInput(generateAutoContestantId(registration, 'short'))}
                      className="text-luxury-gold hover:underline font-mono uppercase"
                      title="Short: SRF-K-101"
                    >
                      Short
                    </button>
                    <span className="text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => setContestantIdInput(generateAutoContestantId(registration, 'number'))}
                      className="text-luxury-gold hover:underline font-mono uppercase"
                      title="Simple: K-101"
                    >
                      Simple
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={contestantIdInput}
                  onChange={(e) => setContestantIdInput(e.target.value.toUpperCase())}
                  placeholder="Type any manual ID (e.g. 101, NLR-01, SRF-K-05)"
                  className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-luxury-gold font-bold focus:outline-none rounded-sm"
                />
                <span className="block text-[10px] text-white/40 mt-1 font-sans">
                  💡 Click auto presets above or directly type any custom manual ID.
                </span>
              </div>

              <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-luxury-gold font-semibold">
                  <span>✉</span>
                  <span>Official Contestant Accreditation</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Upon verification, the <strong>Contestant ID</strong> will be assigned and an official confirmation email will be dispatched to{' '}
                  <span className="text-white font-mono">{base.email || 'registrant email'}</span>. The contestant will log in to the portal using their own registered password.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-luxury-gold hover:bg-luxury-gold/80 text-black font-bold uppercase tracking-wider text-xs"
                >
                  {actionLoading ? 'CONFIRMING...' : 'CONFIRM & ASSIGN CONTESTANT ID ↗'}
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

      {/* OFFICIAL CONTESTANT ID CARD MODAL */}
      {idCardModalOpen && registration.contestantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] border-2 border-luxury-gold/60 w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl rounded-sm my-8">
            <div className="flex items-center justify-between border-b border-luxury-gold/30 pb-3">
              <div>
                <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                  OFFICIAL ACCREDITATION
                </span>
                <h3 className="font-serif text-xl font-light text-white mt-1">
                  Contestant Entry Pass & ID Card
                </h3>
              </div>
              <button
                onClick={() => setIdCardModalOpen(false)}
                className="text-white/60 hover:text-white font-mono text-sm px-2 py-1 bg-white/5 rounded"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Live Rendered Card Component */}
            <div className="flex justify-center py-2">
              <ContestantIdCard
                contestantId={registration.contestantId}
                name={base.name || 'Contestant'}
                categoryName={registration.category?.name}
                categoryCode={registration.category?.code}
                eventName={registration.event?.name}
                eventCode={registration.event?.code}
                eventLogoUrl={registration.event?.logoUrl}
                location={registration.event?.location || base.location}
                startDate={registration.event?.startDate}
                endDate={registration.event?.endDate}
                photoUrl={base.photoUrl}
                gender={base.gender}
                age={base.age}
                paymentStatus={registration.paymentStatus}
                showPrintButton={true}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button size="sm" variant="outline" onClick={() => setIdCardModalOpen(false)}>
                DISMISS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title="DELETE REGISTRATION?"
        message={
          deleteError ||
          `Are you sure you want to permanently delete registration for "${registration?.baseFields?.name || registration?.id}"? This action is irreversible and will remove any associated contestant and scores.`
        }
        confirmLabel="DELETE REGISTRATION"
        onConfirm={handleDeleteRegistration}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteError('');
        }}
        loading={deleteLoading}
      />
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
