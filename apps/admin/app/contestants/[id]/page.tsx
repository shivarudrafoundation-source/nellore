'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { ConfirmModal } from '../../components/confirm-modal';
import { Card, Button, ContestantIdCard, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function ContestantDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contestant, setContestant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [modalError, setModalError] = useState('');

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Edit Contestant ID State
  const [editIdModalOpen, setEditIdModalOpen] = useState(false);
  const [newContestantIdInput, setNewContestantIdInput] = useState('');
  const [editIdPasswordInput, setEditIdPasswordInput] = useState('');
  const [showEditIdPassword, setShowEditIdPassword] = useState(false);
  const [notifyCustomerEmail, setNotifyCustomerEmail] = useState(true);
  const [editIdLoading, setEditIdLoading] = useState(false);
  const [editIdError, setEditIdError] = useState('');

  const generateSuggestedId = (type: 'standard' | 'short' | 'clean_num' = 'standard') => {
    if (!contestant) return '';
    const catCode = (contestant.registration?.category?.code || 'GEN').toUpperCase().trim();
    let mapped = catCode;
    if (catCode === 'K' || catCode.includes('KID')) mapped = 'KIDS';
    else if (catCode === 'T' || catCode.includes('TEEN')) mapped = 'TEEN';
    else if (catCode === 'MISS' || catCode.includes('MISS')) mapped = 'MISS';
    else if (catCode === 'MS' || catCode === 'MRS' || catCode.includes('MS')) mapped = 'MS';
    else if (catCode === 'MR' || catCode.includes('MR')) mapped = 'MR';

    const randSeq = String(Math.floor(100 + Math.random() * 900));
    if (type === 'standard') {
      return `SRF-NLR26-${mapped}-${randSeq}`;
    }
    if (type === 'short') {
      return `SRF-${mapped}-${randSeq}`;
    }
    if (type === 'clean_num') {
      return `${mapped}-${randSeq}`;
    }
    return `SRF-${mapped}-${randSeq}`;
  };

  const handleUpdateContestantId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newContestantIdInput.trim().toUpperCase();
    if (!cleanId) {
      setEditIdError('Please enter a new Contestant ID.');
      return;
    }

    setEditIdLoading(true);
    setEditIdError('');
    setActionMessage('');

    try {
      const res = await fetch(`${API}/admin/contestants/${id}/update-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newContestantId: cleanId,
          password: editIdPasswordInput.trim() || undefined,
          notifyEmail: notifyCustomerEmail,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.message || 'Failed to update Contestant ID.');
      }

      setEditIdModalOpen(false);
      setActionMessage(d.message || `Contestant ID successfully updated to "${cleanId}".`);

      if (cleanId !== id) {
        router.push(`/contestants/${cleanId}`);
      } else {
        await fetchContestant();
      }
    } catch (err: any) {
      setEditIdError(err.message);
    } finally {
      setEditIdLoading(false);
    }
  };

  const handleDeleteContestant = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/admin/contestants/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to delete contestant.');
      }
      router.push('/contestants');
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Admin Score Modal State
  const [adminScoreModalOpen, setAdminScoreModalOpen] = useState(false);
  const [disciplineScore, setDisciplineScore] = useState<string>('');
  const [talentScore, setTalentScore] = useState<string>('');
  const [adminScoreSaving, setAdminScoreSaving] = useState(false);
  const [adminScoreError, setAdminScoreError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const fetchContestant = async () => {
    try {
      const res = await fetch(`${API}/admin/contestants/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load contestant.');
      const d = await res.json();
      setContestant(d);
      setPasswordInput(generateRandomPassword());

      // Extract existing discipline and talent scores
      if (d.scores && Array.isArray(d.scores)) {
        const discScore = d.scores.find((s: any) => s.round?.name?.toLowerCase() === 'discipline');
        const talScore = d.scores.find((s: any) => s.round?.name?.toLowerCase() === 'talent');
        if (discScore) setDisciplineScore(String(discScore.value));
        if (talScore) setTalentScore(String(talScore.value));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestant();
  }, [id]);

  const handleSaveAdminScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const disc = Number(disciplineScore);
    const tal = Number(talentScore);

    if (isNaN(disc) || disc < 0 || disc > 10) {
      setAdminScoreError('Discipline score must be between 0 and 10.');
      return;
    }
    if (isNaN(tal) || tal < 0 || tal > 20) {
      setAdminScoreError('Talent score must be between 0 and 20.');
      return;
    }

    setAdminScoreSaving(true);
    setAdminScoreError('');

    try {
      const res = await fetch(`${API}/admin/scoring/pre-score/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          discipline: disc,
          talent: tal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save Admin evaluation score.');
      }

      setActionMessage(`Admin Evaluation Score (${(disc + tal).toFixed(1)} / 30.0) saved successfully!`);
      await fetchContestant();
      setAdminScoreModalOpen(false);
    } catch (err: any) {
      setAdminScoreError(err.message || 'Failed to save score.');
    } finally {
      setAdminScoreSaving(false);
    }
  };

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

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() => setIdCardModalOpen(true)}
            className="bg-luxury-gold hover:bg-[#E5C158] text-black font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
          >
            <span>🎫</span>
            <span>PRINT ID CARD</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewContestantIdInput(contestant.id);
              setEditIdPasswordInput('');
              setEditIdError('');
              setNotifyCustomerEmail(true);
              setEditIdModalOpen(true);
            }}
            className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-black font-bold text-xs uppercase tracking-wider"
          >
            ✏️ EDIT CONTESTANT ID
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdminScoreError('');
              setAdminScoreModalOpen(true);
            }}
            className="border-luxury-gold/60 text-luxury-gold hover:bg-luxury-gold/10 font-bold text-xs uppercase tracking-wider"
          >
            ⭐ ADMIN SCORE (/30)
          </Button>

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
                ✉ RESET PASSWORD
              </Button>
              <Link href={`/registrations/${contestant.registration.id}`}>
                <Button size="sm" variant="outline">
                  VIEW REGISTRATION ↗
                </Button>
              </Link>
            </>
          )}

          <Button
            size="sm"
            onClick={() => {
              setDeleteError('');
              setDeleteModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider text-xs"
          >
            DELETE CONTESTANT
          </Button>
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

      {/* EDIT CONTESTANT ID MODAL */}
      {editIdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] border-2 border-luxury-gold/60 w-full max-w-lg p-6 space-y-5 shadow-[0_0_50px_rgba(212,175,55,0.15)] rounded-sm relative my-8">
            <div className="flex justify-between items-start border-b border-luxury-gray-border/20 pb-3">
              <div>
                <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                  ADMINISTRATIVE OVERRIDE
                </span>
                <h3 className="font-serif text-xl font-light text-white mt-1">
                  Edit Contestant ID & Access
                </h3>
                <span className="font-sans text-xs text-white/50 block">
                  {base.name || 'Contestant'} • Current ID: <strong className="font-mono text-luxury-gold">{contestant.id}</strong>
                </span>
              </div>
              <button
                onClick={() => setEditIdModalOpen(false)}
                className="text-white/40 hover:text-white text-xl font-sans"
              >
                ✕
              </button>
            </div>

            {editIdError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3">
                <p className="font-sans text-xs text-red-400">{editIdError}</p>
              </div>
            )}

            <form onSubmit={handleUpdateContestantId} className="space-y-5">
              {/* Contestant ID Input */}
              <div className="space-y-2">
                <label className="font-sans text-xs font-semibold text-white/80 uppercase tracking-wider block">
                  New Contestant ID <span className="text-luxury-gold">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newContestantIdInput}
                    onChange={(e) => setNewContestantIdInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="e.g. SRF-MR-001 or SRF-NLR26-MR-0001"
                    className="flex-1 h-10 bg-black border border-luxury-gray-border/40 px-3 font-mono text-sm font-bold text-luxury-gold uppercase outline-none focus:border-luxury-gold tracking-wider"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewContestantIdInput(generateSuggestedId('standard'))}
                    className="text-[10px] font-mono px-2 py-1 bg-luxury-gold/10 hover:bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30 rounded"
                  >
                    Standard: {generateSuggestedId('standard')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewContestantIdInput(generateSuggestedId('short'))}
                    className="text-[10px] font-mono px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 rounded"
                  >
                    Short: {generateSuggestedId('short')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewContestantIdInput(generateSuggestedId('clean_num'))}
                    className="text-[10px] font-mono px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 rounded"
                  >
                    Number: {generateSuggestedId('clean_num')}
                  </button>
                </div>
              </div>

              {/* Optional Password Override */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-sans text-xs font-semibold text-white/80 uppercase tracking-wider">
                    New Portal Password <span className="text-white/40 font-normal lowercase">(optional — leave blank to keep current)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditIdPasswordInput(generateRandomPassword())}
                    className="text-[10px] font-sans text-luxury-gold hover:underline uppercase tracking-wider"
                  >
                    🎲 Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditIdPassword ? 'text' : 'password'}
                    value={editIdPasswordInput}
                    onChange={(e) => setEditIdPasswordInput(e.target.value)}
                    placeholder="Leave blank to keep existing password"
                    className="w-full h-10 bg-black border border-luxury-gray-border/40 px-3 pr-10 font-mono text-sm text-white outline-none focus:border-luxury-gold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditIdPassword(!showEditIdPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-mono"
                  >
                    {showEditIdPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {/* Email Notification Checkbox */}
              <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 rounded-sm space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCustomerEmail}
                    onChange={(e) => setNotifyCustomerEmail(e.target.checked)}
                    className="mt-0.5 accent-[#D4AF37] w-4 h-4 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-sans text-xs text-luxury-gold font-semibold block">
                      Send Email Notification to Contestant
                    </span>
                    <span className="font-sans text-[11px] text-white/70 block mt-0.5">
                      Dispatches official confirmation with the new Contestant ID and portal credentials to{' '}
                      <strong className="text-white font-mono">{base.email || 'contestant email'}</strong>.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={editIdLoading}
                  className="flex-1 bg-luxury-gold hover:bg-[#E5C158] text-black font-bold uppercase tracking-wider text-xs shadow-md"
                >
                  {editIdLoading ? 'UPDATING ID & DISPATCHING...' : 'SAVE & UPDATE ID ↗'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditIdModalOpen(false)}
                  className="text-xs"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN SCORE ENTRY MODAL */}
      {adminScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0A0A0A] border-2 border-luxury-gold/60 w-full max-w-md p-6 space-y-5 shadow-[0_0_50px_rgba(212,175,55,0.15)] rounded-sm relative">
            <div className="flex justify-between items-start border-b border-luxury-gray-border/20 pb-3">
              <div>
                <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                  ADMIN EVALUATION SCORE
                </span>
                <h3 className="font-mono text-xl font-bold text-white mt-1">
                  {contestant.id}
                </h3>
                <span className="font-sans text-xs text-white/50 block">
                  {base.name} • <strong className="text-luxury-gold">{contestant.registration?.category?.name}</strong>
                </span>
              </div>
              <button
                onClick={() => setAdminScoreModalOpen(false)}
                className="text-white/40 hover:text-white text-xl font-sans"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminScore} className="space-y-4">
              {/* Discipline Field (0 - 10) */}
              <div className="space-y-2 p-3 bg-[#050505] border border-luxury-gray-border/30">
                <div className="flex justify-between items-center">
                  <label className="font-sans text-xs font-semibold text-white uppercase tracking-wider">
                    1. Discipline & Grooming
                  </label>
                  <span className="font-mono text-xs text-luxury-gold font-bold">MAX: 10.0 PTS</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    placeholder="e.g. 8.5"
                    value={disciplineScore}
                    onChange={(e) => setDisciplineScore(e.target.value)}
                    className="flex-1 h-10 bg-black border border-luxury-gray-border/40 px-3 font-mono text-sm font-bold text-luxury-gold outline-none focus:border-luxury-gold"
                  />
                  <div className="flex gap-1">
                    {['6', '8', '9', '10'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDisciplineScore(p)}
                        className={`h-10 px-2 font-mono text-xs border transition-colors ${
                          disciplineScore === p
                            ? 'border-luxury-gold bg-luxury-gold text-black font-bold'
                            : 'border-white/10 text-white/60 hover:border-luxury-gold/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Talent Field (0 - 20) */}
              <div className="space-y-2 p-3 bg-[#050505] border border-luxury-gray-border/30">
                <div className="flex justify-between items-center">
                  <label className="font-sans text-xs font-semibold text-white uppercase tracking-wider">
                    2. Talent Demonstration
                  </label>
                  <span className="font-mono text-xs text-luxury-gold font-bold">MAX: 20.0 PTS</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    required
                    placeholder="e.g. 17.0"
                    value={talentScore}
                    onChange={(e) => setTalentScore(e.target.value)}
                    className="flex-1 h-10 bg-black border border-luxury-gray-border/40 px-3 font-mono text-sm font-bold text-luxury-gold outline-none focus:border-luxury-gold"
                  />
                  <div className="flex gap-1">
                    {['12', '15', '18', '20'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTalentScore(p)}
                        className={`h-10 px-2 font-mono text-xs border transition-colors ${
                          talentScore === p
                            ? 'border-luxury-gold bg-luxury-gold text-black font-bold'
                            : 'border-white/10 text-white/60 hover:border-luxury-gold/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Aggregate Score Preview */}
              <div className="p-3 bg-black border border-luxury-gold/40 flex justify-between items-center">
                <span className="font-sans text-xs text-white/70 uppercase">
                  TOTAL ADMIN SCORE:
                </span>
                <span className="font-mono text-lg font-bold text-luxury-gold">
                  {(Number(disciplineScore || 0) + Number(talentScore || 0)).toFixed(1)} / 30.0 PTS
                </span>
              </div>

              {adminScoreError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs">
                  {adminScoreError}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={adminScoreSaving}
                  className="flex-1 bg-luxury-gold hover:bg-[#E5C158] text-black font-bold uppercase tracking-wider text-xs"
                >
                  {adminScoreSaving ? 'SAVING...' : 'SAVE ADMIN SCORE 💾'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdminScoreModalOpen(false)}
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
      {idCardModalOpen && (
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
                contestantId={contestant.id}
                name={base.name || 'Contestant'}
                categoryName={contestant.registration?.category?.name}
                categoryCode={contestant.registration?.category?.code}
                eventName={contestant.event?.name}
                eventCode={contestant.event?.code}
                eventLogoUrl={contestant.event?.logoUrl}
                location={contestant.event?.location || base.location}
                startDate={contestant.event?.startDate}
                endDate={contestant.event?.endDate}
                photoUrl={base.photoUrl}
                gender={base.gender}
                age={base.age}
                paymentStatus={contestant.registration?.paymentStatus || 'PAID'}
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
        title="DELETE CONTESTANT?"
        message={
          deleteError ||
          `Are you sure you want to permanently delete contestant "${contestant?.id}" (${contestant?.registration?.baseFields?.name || 'Contestant'})? This will remove all their logged scores.`
        }
        confirmLabel="DELETE CONTESTANT"
        onConfirm={handleDeleteContestant}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteError('');
        }}
        loading={deleteLoading}
      />

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
