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
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [modalError, setModalError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  useEffect(() => {
    async function fetchContestant() {
      try {
        const res = await fetch(`${API}/admin/contestants/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load contestant.');
        const d = await res.json();
        setContestant(d);
        setPasswordInput(generateRandomPassword());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchContestant();
  }, [id]);

  const handleResendCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestant.registration?.id) {
      setModalError('No linked registration record found for this contestant.');
      return;
    }
    if (!passwordInput.trim()) {
      setModalError('Please enter a password.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    setActionMessage('');

    try {
      const res = await fetch(`${API}/admin/registrations/${contestant.registration.id}/resend-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: passwordInput.trim(),
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || 'Failed to dispatch credentials.');
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

        <div className="flex items-center gap-3">
          {contestant.registration?.id && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPasswordInput(generateRandomPassword());
                  setModalError('');
                  setResendModalOpen(true);
                }}
                className="border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold hover:text-black font-semibold text-xs uppercase"
              >
                ✉ RESET / RESEND CREDENTIALS
              </Button>
              <Link href={`/registrations/${contestant.registration.id}`}>
                <Button size="sm" variant="outline">
                  VIEW REGISTRATION ↗
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="font-sans text-sm text-green-400">{actionMessage}</p>
        </div>
      )}

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

      {/* RESEND / RESET CREDENTIALS MODAL */}
      {resendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-md p-6 space-y-5 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gray-border/20 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                CREDENTIAL MANAGEMENT
              </span>
              <h3 className="font-serif text-xl font-light text-white mt-1">
                Reset Password & Dispatch Email
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
                <span className="text-luxury-gold font-mono font-bold">{contestant.id}</span>
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

              <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 rounded-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-luxury-gold font-semibold">
                  <span>✉</span>
                  <span>Instant Email Notification</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Upon submission, the updated password and login link will be sent to{' '}
                  <span className="text-white font-mono">{base.email}</span>.
                </p>
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
