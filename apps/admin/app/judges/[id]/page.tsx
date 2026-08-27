'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { ConfirmModal } from '../../components/confirm-modal';
import { Card, Button, Input, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function JudgeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [judge, setJudge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & Action states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [confirmAction, setConfirmAction] = useState<'disable' | 'enable' | 'reset' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [tempPasswordModal, setTempPasswordModal] = useState<{ open: boolean; password: string }>({
    open: false,
    password: '',
  });

  const fetchJudge = async () => {
    try {
      const res = await fetch(`${API}/admin/judges/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load judge details.');
      const d = await res.json();
      setJudge(d);
      setEditName(d.name);
      setEditEmail(d.email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJudge();
  }, [id]);

  // Load events for assign modal
  useEffect(() => {
    if (!assignModalOpen) return;
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=100`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data);
          if (judge?.assignedEventId) {
            setSelectedEventId(judge.assignedEventId);
          } else if (d.data.length > 0) {
            setSelectedEventId(d.data[0].id);
          }
        }
      } catch {}
    }
    loadEvents();
  }, [assignModalOpen, judge]);

  // Load categories for assign modal
  useEffect(() => {
    if (!assignModalOpen || !selectedEventId) return;
    async function loadCategories() {
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${selectedEventId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          setCategories(d.data);
          if (judge?.assignedCategoryId && d.data.some((c: any) => c.id === judge.assignedCategoryId)) {
            setSelectedCategoryId(judge.assignedCategoryId);
          } else if (d.data.length > 0) {
            setSelectedCategoryId(d.data[0].id);
          } else {
            setSelectedCategoryId('');
          }
        }
      } catch {}
    }
    loadCategories();
  }, [assignModalOpen, selectedEventId, judge]);

  // Load rounds for assign modal
  useEffect(() => {
    if (!assignModalOpen || !selectedCategoryId) return;
    async function loadRounds() {
      try {
        const res = await fetch(`${API}/admin/rounds?categoryId=${selectedCategoryId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          setRounds(d.data);
          if (judge?.assignedRoundId && d.data.some((r: any) => r.id === judge.assignedRoundId)) {
            setSelectedRoundId(judge.assignedRoundId);
          } else if (d.data.length > 0) {
            setSelectedRoundId(d.data[0].id);
          } else {
            setSelectedRoundId('');
          }
        }
      } catch {}
    }
    loadRounds();
  }, [assignModalOpen, selectedCategoryId, judge]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API}/admin/judges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim().toLowerCase() }),
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to update judge.');
      }
      setEditModalOpen(false);
      fetchJudge();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    setAssignError('');
    try {
      const res = await fetch(`${API}/admin/judges/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          categoryId: selectedCategoryId,
          roundId: selectedRoundId,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to reassign judge.');
      }
      setAssignModalOpen(false);
      fetchJudge();
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError('');
    try {
      let endpoint = '';
      if (confirmAction === 'disable') endpoint = `${API}/admin/judges/${id}/disable`;
      if (confirmAction === 'enable') endpoint = `${API}/admin/judges/${id}/enable`;
      if (confirmAction === 'reset') endpoint = `${API}/admin/judges/${id}/reset-password`;

      const res = await fetch(endpoint, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Action failed.');
      }

      const result = await res.json();

      if (confirmAction === 'reset' && result.temporaryPassword) {
        setTempPasswordModal({ open: true, password: result.temporaryPassword });
      }

      setConfirmAction(null);
      fetchJudge();
    } catch (err: any) {
      setActionError(err.message);
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

  if (error || !judge) {
    return <p className="font-sans text-sm text-red-400">{error || 'Judge not found.'}</p>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">{judge.name}</h2>
            <span
              className={`font-sans text-[10px] tracking-luxury uppercase font-bold px-2 py-0.5 border ${
                judge.isActive
                  ? 'border-green-500/30 text-green-400 bg-green-500/5'
                  : 'border-red-500/30 text-red-400 bg-red-500/5'
              }`}
            >
              {judge.isActive ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
          <p className="font-sans text-xs text-luxury-white/50 mt-1">{judge.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => setEditModalOpen(true)}>
            EDIT PROFILE
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAssignModalOpen(true)}>
            REASSIGN
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmAction('reset')}>
            RESET PASSWORD
          </Button>
          {judge.isActive ? (
            <Button
              size="sm"
              onClick={() => setConfirmAction('disable')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              DISABLE
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setConfirmAction('enable')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              ENABLE
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Active Assignment & Account Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
              Active Assignment
            </h4>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:underline uppercase"
            >
              Change ↗
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Event', value: judge.event?.name },
              { label: 'Category', value: judge.category?.name },
              { label: 'Round', value: judge.round?.name },
              { label: 'Round Max Marks', value: judge.round ? `${judge.round.maxMarks} pts` : '—' },
              { label: 'Round Day', value: judge.round ? `Day ${judge.round.day}` : '—' },
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
            Account Status & Security
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Account ID', value: judge.id },
              { label: 'Status', value: judge.isActive ? 'Active' : 'Disabled' },
              {
                label: 'Forced Password Reset',
                value: judge.mustResetPassword ? 'Pending (Required on next login)' : 'Completed',
              },
              {
                label: 'Created On',
                value: new Date(judge.createdAt).toLocaleDateString('en-IN', {
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
                <span className="font-sans text-xs text-luxury-white/80 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Scores Evaluation History */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
        <h4 className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold">
          Recent Evaluations Logged ({judge._count?.scores || 0})
        </h4>
        {judge.scores && judge.scores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Contestant ID', 'Round', 'Score Value', 'Status', 'Submitted At'].map((h) => (
                    <th key={h} className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-2 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {judge.scores.map((sc: any) => (
                  <tr key={sc.id} className="border-b border-luxury-gray-border/5">
                    <td className="font-mono text-xs font-bold text-luxury-gold py-2.5 pr-4">{sc.contestantId}</td>
                    <td className="font-sans text-xs text-luxury-white/80 py-2.5 pr-4">{sc.round?.name}</td>
                    <td className="font-mono text-xs font-bold text-luxury-white py-2.5 pr-4">{sc.value} pts</td>
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
              No scoring entries recorded yet by this judge
            </span>
          </div>
        )}
      </Card>

      <div className="pt-4">
        <Button variant="text" onClick={() => router.push('/judges')}>
          ← BACK TO JUDGES
        </Button>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gray-border/30 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">Edit Judge Profile</h3>
            {editError && <p className="font-sans text-xs text-red-400">{editError}</p>}
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <Input
                label="Full Name *"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="Email Address *"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="text" onClick={() => setEditModalOpen(false)}>
                  CANCEL
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gray-border/30 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">Reassign Judge</h3>
            {assignError && <p className="font-sans text-xs text-red-400">{assignError}</p>}
            <form onSubmit={handleAssignSubmit} className="space-y-6">
              <div>
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
                  1. Event *
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
                >
                  <option value="">Select Event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
                  2. Category *
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={categories.length === 0}
                  className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none disabled:opacity-30"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
                  3. Round *
                </label>
                <select
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                  disabled={rounds.length === 0}
                  className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none disabled:opacity-30"
                >
                  <option value="">Select Round</option>
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Day {r.day})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="text" onClick={() => setAssignModalOpen(false)}>
                  CANCEL
                </Button>
                <Button type="submit" disabled={assignLoading}>
                  {assignLoading ? 'ASSIGNING...' : 'UPDATE ASSIGNMENT'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction === 'reset'
            ? 'RESET JUDGE PASSWORD?'
            : confirmAction === 'disable'
            ? 'DISABLE JUDGE ACCOUNT?'
            : 'ENABLE JUDGE ACCOUNT?'
        }
        message={
          actionError ||
          (confirmAction === 'reset'
            ? `A new temporary password will be generated and shown ONCE. The judge will be forced to change it on their next login.`
            : confirmAction === 'disable'
            ? `The judge will immediately lose access to the scoring portal.`
            : `The judge will be granted access to the scoring portal.`)
        }
        confirmLabel={confirmAction === 'reset' ? 'RESET PASSWORD' : confirmAction === 'disable' ? 'DISABLE' : 'ENABLE'}
        onConfirm={handleActionConfirm}
        onCancel={() => {
          setConfirmAction(null);
          setActionError('');
        }}
        loading={actionLoading}
      />

      {/* One-Time Temporary Password Display Modal */}
      {tempPasswordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/50 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
              New Temporary Password
            </h3>
            <p className="font-sans text-xs text-luxury-white/60 leading-relaxed">
              Provide this credential to the judge. The judge will be forced to configure a permanent password on login.
            </p>
            <div className="p-4 bg-black border border-luxury-gold/30 text-center">
              <span className="font-mono text-lg font-bold text-luxury-gold tracking-wider select-all">
                {tempPasswordModal.password}
              </span>
            </div>
            <p className="font-sans text-[11px] text-yellow-500/80 text-center">
              ⚠️ Warning: This password will NOT be displayed again.
            </p>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setTempPasswordModal({ open: false, password: '' })}>
                DONE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgeDetailPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <JudgeDetailContent />
      </AdminShell>
    </AuthGuard>
  );
}
