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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [confirmAction, setConfirmAction] = useState<'disable' | 'enable' | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
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

      const assignedCatIds: string[] = Array.isArray(d.assignedCategoryIds) && d.assignedCategoryIds.length > 0
        ? d.assignedCategoryIds
        : (d.assignedCategoryId ? [d.assignedCategoryId] : []);
      setSelectedCategoryIds(assignedCatIds);
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
          const cats = d.data || [];
          setCategories(cats);
          if (judge?.assignedCategoryIds && Array.isArray(judge.assignedCategoryIds) && judge.assignedCategoryIds.length > 0) {
            setSelectedCategoryIds(judge.assignedCategoryIds);
          } else if (judge?.assignedCategoryId) {
            setSelectedCategoryIds([judge.assignedCategoryId]);
          } else {
            setSelectedCategoryIds(cats.map((c: any) => c.id));
          }
        }
      } catch {}
    }
    loadCategories();
  }, [assignModalOpen, selectedEventId, judge]);

  // Load rounds for assign modal
  useEffect(() => {
    const primaryCatId = selectedCategoryIds[0];
    if (!assignModalOpen || !primaryCatId) return;
    async function loadRounds() {
      try {
        const res = await fetch(`${API}/admin/rounds?categoryId=${primaryCatId}&limit=100`, {
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
  }, [assignModalOpen, selectedCategoryIds, judge]);

  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      if (selectedCategoryIds.length === 1) return;
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds((prev) => [...prev, catId]);
    }
  };

  const selectAllCategories = () => {
    setSelectedCategoryIds(categories.map((c) => c.id));
  };

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
    if (selectedCategoryIds.length === 0) {
      setAssignError('Please select at least one category.');
      return;
    }
    setAssignLoading(true);
    setAssignError('');
    try {
      const res = await fetch(`${API}/admin/judges/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          categoryId: selectedCategoryIds[0],
          categoryIds: selectedCategoryIds,
          roundId: selectedRoundId || undefined,
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

  const generateCleanPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = 'SRF@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const openPasswordModal = () => {
    setNewPasswordInput(generateCleanPassword());
    setShowNewPassword(false);
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) {
      setPasswordError('Please enter or generate a password.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      const res = await fetch(`${API}/admin/judges/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPasswordInput.trim() }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Unable to update password.');
      }

      const result = await res.json();
      setPasswordModalOpen(false);
      setTempPasswordModal({
        open: true,
        password: result.password || result.temporaryPassword || newPasswordInput.trim(),
      });
      fetchJudge();
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
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

      const res = await fetch(endpoint, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Action failed.');
      }

      setConfirmAction(null);
      fetchJudge();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const assignedCategoriesList = judge.assignedCategories && judge.assignedCategories.length > 0
    ? judge.assignedCategories
    : (judge.category ? [judge.category] : []);

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
            REASSIGN CATEGORIES
          </Button>
          <Button size="sm" variant="outline" onClick={openPasswordModal}>
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
              Active Assignment ({assignedCategoriesList.length} Categories)
            </h4>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:underline uppercase"
            >
              Change ↗
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury">Event</span>
              <span className="font-sans text-xs text-luxury-white/80 font-medium">{judge.event?.name || '—'}</span>
            </div>

            <div>
              <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury block mb-1.5">
                Assigned Categories
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assignedCategoriesList.map((c: any) => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 bg-luxury-gold/10 border border-luxury-gold/30 text-luxury-gold font-mono text-[11px] font-bold"
                  >
                    {c.name} ({c.code})
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury">Primary Round</span>
              <span className="font-sans text-xs text-luxury-white/80 font-medium">{judge.round?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-[11px] text-luxury-white/30 uppercase tracking-luxury">Round Max Marks</span>
              <span className="font-mono text-xs text-luxury-gold font-bold">{judge.round ? `${judge.round.maxMarks} pts` : '—'}</span>
            </div>
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
          <div className="bg-[#0A0A0A] border border-luxury-gray-border/40 w-full max-w-md p-6 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">Edit Judge Profile</h3>
            {editError && <p className="font-sans text-xs text-red-400">{editError}</p>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
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

      {/* Reassign Modal with Multi-Category Support */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gray-border/40 w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">Reassign Judge Categories</h3>
            {assignError && <p className="font-sans text-xs text-red-400">{assignError}</p>}
            <form onSubmit={handleAssignSubmit} className="space-y-5">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block">
                    2. Assigned Categories (Multi-Select) *
                  </label>
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    className="text-[10px] text-luxury-gold hover:underline uppercase font-mono"
                  >
                    ✓ Select All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-[#050505] border border-luxury-gray-border/30 rounded-sm max-h-48 overflow-y-auto">
                  {categories.map((c) => {
                    const isChecked = selectedCategoryIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        onClick={() => toggleCategory(c.id)}
                        className={`flex items-center gap-2.5 p-2 border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-luxury-gold/10 border-luxury-gold/60 text-white'
                            : 'bg-[#111111] border-luxury-gray-border/20 text-white/60 hover:border-luxury-gold/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-luxury-gold h-4 w-4"
                        />
                        <span className="text-xs font-medium uppercase font-sans">{c.name} ({c.code})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
                  3. Primary Round
                </label>
                <select
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                  disabled={rounds.length === 0}
                  className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none disabled:opacity-30"
                >
                  <option value="">Auto-assign all judge rounds</option>
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

      {/* Password Management Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/50 w-full max-w-md p-6 space-y-5 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gold/30 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                JUDGE CREDENTIAL CONTROL
              </span>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide mt-1">
                Update Judge Password
              </h3>
            </div>

            <p className="font-sans text-xs text-luxury-white/60 leading-relaxed">
              Configure a new login password for judge <span className="text-white font-bold">{judge.name}</span> ({judge.id}).
            </p>

            {passwordError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateCleanPassword())}
                    className="text-[10px] text-luxury-gold hover:underline font-mono uppercase"
                  >
                    ⚡ Auto Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#050505] border border-luxury-gold/50 focus:border-luxury-gold px-3.5 py-2.5 font-mono text-sm text-white focus:outline-none rounded-sm pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-1 bg-white/5 rounded"
                  >
                    {showNewPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="text" onClick={() => setPasswordModalOpen(false)}>
                  CANCEL
                </Button>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? 'UPDATING...' : 'CONFIRM PASSWORD'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Password Display Modal */}
      {tempPasswordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/50 w-full max-w-md p-8 space-y-6 shadow-2xl rounded-sm">
            <div className="border-b border-luxury-gold/30 pb-3">
              <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                PASSWORD UPDATED
              </span>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide mt-1">
                New Password Active
              </h3>
            </div>

            <p className="font-sans text-xs text-luxury-white/60 leading-relaxed">
              New credentials for <span className="text-white font-bold">{judge.name}</span>:
            </p>

            <div className="bg-black/90 border border-luxury-gold/30 p-4 space-y-3 rounded-sm text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/40 uppercase text-[10px]">Judge ID:</span>
                <span className="font-mono font-bold text-luxury-gold">{judge.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 uppercase text-[10px]">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-luxury-gold tracking-wider">{tempPasswordModal.password}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tempPasswordModal.password, 'modalPass')}
                    className="text-[10px] text-white/50 hover:text-white font-mono uppercase px-1.5 py-0.5 bg-white/5 rounded"
                  >
                    {copiedField === 'modalPass' ? 'COPIED!' : 'COPY'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setTempPasswordModal({ open: false, password: '' })}>
                DISMISS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disable/Enable Confirmation */}
      <ConfirmModal
        open={confirmAction !== null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleActionConfirm}
        title={confirmAction === 'disable' ? 'Disable Judge Account' : 'Enable Judge Account'}
        message={`Are you sure you want to ${confirmAction} "${judge.name}"? ${
          confirmAction === 'disable'
            ? 'They will be immediately logged out and unable to submit scores.'
            : 'They will be able to log in and score assigned contestants.'
        }`}
        confirmLabel={confirmAction === 'disable' ? 'DISABLE ACCOUNT' : 'ENABLE ACCOUNT'}
        loading={actionLoading}
      />
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
