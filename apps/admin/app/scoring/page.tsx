'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Pagination } from '../components/pagination';
import { useRealtimeScores } from '../../hooks/useRealtimeScores';
import { Card, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function ScoringContent() {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'FINAL_MATRIX' | 'ROUND_STANDINGS'>('FINAL_MATRIX');

  // Ledger state
  const [scores, setScores] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedLockStatus, setSelectedLockStatus] = useState('');
  const [contestantSearch, setContestantSearch] = useState('');
  const [selectedScoreModal, setSelectedScoreModal] = useState<any | null>(null);
  const [unlockConfirmScore, setUnlockConfirmScore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastLiveUpdateMsg, setLastLiveUpdateMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Final Matrix state
  const [finalScores, setFinalScores] = useState<any[]>([]);
  const [finalCategoryFilter, setFinalCategoryFilter] = useState('');
  const [finalLoading, setFinalLoading] = useState(false);

  // Round Standings state (Phase 6F)
  const [standingsEventId, setStandingsEventId] = useState('');
  const [standingsCategoryId, setStandingsCategoryId] = useState('');
  const [standingsRoundId, setStandingsRoundId] = useState('');
  const [standingsCategories, setStandingsCategories] = useState<any[]>([]);
  const [standingsRounds, setStandingsRounds] = useState<any[]>([]);
  const [roundStandingsData, setRoundStandingsData] = useState<any | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);

  // Result Publication State
  const [publication, setPublication] = useState<any>(null);
  const [showPubModal, setShowPubModal] = useState(false);
  const [pubLoading, setPubLoading] = useState(false);

  // 1. Fetch Events for filter dropdown
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=50`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data || []);
          if (d.data && d.data.length > 0 && !selectedEventId) {
            setSelectedEventId(d.data[0].id);
            setStandingsEventId(d.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadEvents();
  }, []);

  // Fetch categories for Standings
  useEffect(() => {
    if (!standingsEventId) return;
    async function loadStandingsCats() {
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${standingsEventId}&limit=50`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setStandingsCategories(d.data || []);
          if (d.data && d.data.length > 0) {
            setStandingsCategoryId(d.data[0].id);
          } else {
            setStandingsCategoryId('');
            setStandingsRounds([]);
            setStandingsRoundId('');
          }
        }
      } catch {}
    }
    loadStandingsCats();
  }, [standingsEventId]);

  // Fetch rounds for Standings
  useEffect(() => {
    if (!standingsCategoryId) {
      setStandingsRounds([]);
      setStandingsRoundId('');
      return;
    }
    async function loadStandingsRounds() {
      try {
        const res = await fetch(`${API}/admin/rounds?categoryId=${standingsCategoryId}&limit=50`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setStandingsRounds(d.data || []);
          if (d.data && d.data.length > 0) {
            setStandingsRoundId(d.data[0].id);
          } else {
            setStandingsRoundId('');
            setRoundStandingsData(null);
          }
        }
      } catch {}
    }
    loadStandingsRounds();
  }, [standingsCategoryId]);

  // Fetch Round Standings
  useEffect(() => {
    if (!standingsRoundId) {
      setRoundStandingsData(null);
      return;
    }
    async function fetchStandings() {
      setStandingsLoading(true);
      try {
        const res = await fetch(`${API}/admin/rounds/${standingsRoundId}/standings`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setRoundStandingsData(d);
        } else {
          setRoundStandingsData(null);
        }
      } catch {
        setRoundStandingsData(null);
      } finally {
        setStandingsLoading(false);
      }
    }
    fetchStandings();
  }, [standingsRoundId]);

  // 2. Fetch Publication Status
  const fetchPublicationStatus = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const params = new URLSearchParams({ eventId: selectedEventId });
      if (finalCategoryFilter) params.set('categoryId', finalCategoryFilter);

      const res = await fetch(`${API}/admin/scoring/publication-status?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const d = await res.json();
        setPublication(d);
      } else {
        setPublication(null);
      }
    } catch {
      setPublication(null);
    }
  }, [selectedEventId, finalCategoryFilter]);

  // 3. Fetch Final Scores Matrix
  const fetchFinalScores = useCallback(async () => {
    setFinalLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEventId) params.set('eventId', selectedEventId);
      if (finalCategoryFilter) params.set('categoryId', finalCategoryFilter);

      const res = await fetch(`${API}/admin/scoring/final-scores?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const d = await res.json();
        setFinalScores(d || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFinalLoading(false);
    }
  }, [selectedEventId, finalCategoryFilter]);

  // 4. Real-time Live Score Updates without Browser Refresh
  const handleLiveScoreEvent = useCallback((event: any) => {
    setScores((prevScores) => {
      let updated = false;
      const nextScores = prevScores.map((s) => {
        const isMatch =
          s.contestantId === event.contestantId &&
          (s.round?.id === event.roundId || s.roundId === event.roundId) &&
          (s.judge?.id === event.judgeId || s.judgeId === event.judgeId);

        if (isMatch) {
          updated = true;
          return {
            ...s,
            value: event.totalScore,
            subScores: event.subScores,
            locked: event.status === 'LOCKED',
            submittedAt: event.timestamp || new Date().toISOString(),
          };
        }
        return s;
      });

      if (!updated) {
        const newRecord = {
          id: `live-${event.eventId || Date.now()}`,
          contestantId: event.contestantId,
          value: event.totalScore,
          subScores: event.subScores,
          locked: event.status === 'LOCKED',
          submittedAt: event.timestamp || new Date().toISOString(),
          judge: {
            id: event.judgeId,
            name: event.judgeName || 'Judge',
            email: '',
          },
          round: {
            id: event.roundId,
            name: event.roundName || 'Round',
            maxMarks: event.roundMaxMarks || 50,
            day: 1,
            category: {
              id: event.categoryId,
              name: event.categoryName || 'Category',
              code: event.categoryCode || 'CAT',
              event: {
                id: event.competitionEventId,
                name: 'Nellore Nerajana',
              },
            },
          },
        };
        return [newRecord, ...prevScores];
      }

      return nextScores;
    });

    setLastLiveUpdateMsg(
      `Live update received: Contestant ${event.contestantId} evaluated (${event.totalScore} pts) - ${new Date().toLocaleTimeString()}`,
    );

    // Refresh final scores matrix live
    fetchFinalScores();
  }, [fetchFinalScores]);

  // Connect WebSocket live score subscription for Admin
  const { connectionState } = useRealtimeScores({
    eventId: selectedEventId || undefined,
    role: 'ADMIN',
    onScoreEvent: handleLiveScoreEvent,
  });

  const isConnected = connectionState === 'CONNECTED';

  // 5. Fetch Paginated Scores Ledger
  const fetchScores = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
        });

        if (selectedEventId) params.set('eventId', selectedEventId);
        if (contestantSearch) params.set('contestantId', contestantSearch);
        if (selectedLockStatus) params.set('locked', selectedLockStatus);

        const res = await fetch(`${API}/admin/scoring?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load evaluations.');
        const data = await res.json();
        setScores(data.data);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [selectedEventId, contestantSearch, selectedLockStatus],
  );

  useEffect(() => {
    fetchScores(1);
    fetchFinalScores();
    fetchPublicationStatus();
  }, [fetchScores, fetchFinalScores, fetchPublicationStatus]);

  const handleUnlockScore = async (scoreId: string) => {
    setActionLoadingId(scoreId);
    try {
      const res = await fetch(`${API}/admin/scoring/unlock/${scoreId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to unlock score.');
      await fetchScores(pagination.page);
      await fetchFinalScores();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLockScore = async (scoreId: string) => {
    setActionLoadingId(scoreId);
    try {
      const res = await fetch(`${API}/admin/scoring/lock/${scoreId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to lock score.');
      await fetchScores(pagination.page);
      await fetchFinalScores();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTogglePublish = async () => {
    setPubLoading(true);
    try {
      const isCurrentlyPublished = !!publication?.isPublished;
      const res = await fetch(`${API}/admin/scoring/publish-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventId: selectedEventId,
          categoryId: finalCategoryFilter || undefined,
          isPublished: !isCurrentlyPublished,
        }),
      });

      if (!res.ok) throw new Error('Failed to update publication status.');
      setShowPubModal(false);
      await fetchPublicationStatus();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPubLoading(false);
    }
  };

  const selectedEventObj = events.find((e) => e.id === selectedEventId);
  const isResultsPublished = !!publication?.isPublished;

  return (
    <div className="space-y-6">
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
            Scoring & Leaderboard Engine
          </h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Authoritative Scoring Structure • KIDS (230) & MR/MISS/MS/TEEN (430)
          </p>
        </div>

        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#0A0A0A] border border-luxury-gray-border/20">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              }`}
            />
            <span className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
              {isConnected ? 'LIVE SYNC ACTIVE' : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </div>

      {lastLiveUpdateMsg && (
        <div className="p-3 bg-luxury-gold/5 border border-luxury-gold/20 flex items-center justify-between">
          <span className="font-sans text-xs text-luxury-gold">⚡ {lastLiveUpdateMsg}</span>
          <button
            onClick={() => setLastLiveUpdateMsg(null)}
            className="text-luxury-gold/50 hover:text-luxury-gold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-luxury-gray-border/20 gap-8">
        <button
          onClick={() => setActiveTab('FINAL_MATRIX')}
          className={`pb-3 font-sans text-xs tracking-luxury uppercase font-bold transition-colors ${
            activeTab === 'FINAL_MATRIX'
              ? 'text-luxury-gold border-b-2 border-luxury-gold'
              : 'text-luxury-white/40 hover:text-luxury-white'
          }`}
        >
          FINAL LEADERBOARD MATRIX (KIDS /230 • OTHERS /430)
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`pb-3 font-sans text-xs tracking-luxury uppercase font-bold transition-colors ${
            activeTab === 'LEDGER'
              ? 'text-luxury-gold border-b-2 border-luxury-gold'
              : 'text-luxury-white/40 hover:text-luxury-white'
          }`}
        >
          ROUND EVALUATION LEDGER & UNLOCK CONSOLE
        </button>
        <button
          onClick={() => setActiveTab('ROUND_STANDINGS')}
          className={`pb-3 font-sans text-xs tracking-luxury uppercase font-bold transition-colors ${
            activeTab === 'ROUND_STANDINGS'
              ? 'text-luxury-gold border-b-2 border-luxury-gold'
              : 'text-luxury-white/40 hover:text-luxury-white'
          }`}
        >
          ROUND STANDINGS & RANKINGS
        </button>
      </div>

      {activeTab === 'FINAL_MATRIX' ? (
        /* TAB 1: FINAL LEADERBOARD MATRIX */
        <div className="space-y-6">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white uppercase tracking-luxury outline-none focus:border-luxury-gold/40 flex-1"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>

                <select
                  value={finalCategoryFilter}
                  onChange={(e) => setFinalCategoryFilter(e.target.value)}
                  className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[180px]"
                >
                  <option value="">All Categories</option>
                  <option value="KIDS">Kids (/230)</option>
                  <option value="MR">Mr (/430)</option>
                  <option value="MISS">Miss (/430)</option>
                  <option value="MS">Ms (/430)</option>
                  <option value="TEEN">Teen (/430)</option>
                </select>

                <Button size="sm" variant="outline" onClick={fetchFinalScores}>
                  REFRESH ↻
                </Button>
              </div>

              {/* Publication Control Button */}
              <div className="flex items-center gap-3 pt-2 lg:pt-0">
                <span
                  className={`font-sans text-[10px] tracking-luxury uppercase font-bold px-3 py-1 border ${
                    isResultsPublished
                      ? 'text-green-400 border-green-500/30 bg-green-500/10'
                      : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                  }`}
                >
                  {isResultsPublished ? 'RESULTS PUBLISHED' : 'RESULTS UNPUBLISHED'}
                </span>

                <Button
                  size="sm"
                  variant={isResultsPublished ? 'outline' : 'solid'}
                  onClick={() => setShowPubModal(true)}
                >
                  {isResultsPublished ? 'UNPUBLISH RESULTS 🚫' : 'PUBLISH RESULTS 📢'}
                </Button>
              </div>
            </div>
          </Card>

          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
            {finalLoading ? (
              <div className="p-6 space-y-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-luxury-gray-border/10 rounded" />
                ))}
              </div>
            ) : finalScores.length === 0 ? (
              <div className="p-16 text-center">
                <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
                  NO CONTESTANTS FOUND FOR FINAL SCORING
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-luxury-gray-border/10 text-luxury-white/40 uppercase tracking-luxury text-[9px]">
                      <th className="py-3 px-4 pl-6">Rank</th>
                      <th className="py-3 px-4">Contestant ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Admin Score (/30)</th>
                      <th className="py-3 px-4">Judges Score</th>
                      <th className="py-3 px-4">Final Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-gray-border/5 text-luxury-white">
                    {finalScores.map((row) => (
                      <tr key={row.contestantId} className="hover:bg-luxury-gold/[0.02] transition-colors">
                        <td className="py-3 px-4 pl-6 font-serif text-luxury-gold font-bold text-sm">
                          #{row.rank}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-luxury-white">
                          {row.contestantId}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold uppercase text-luxury-gold/90">{row.category}</span>
                          <span className="block text-[10px] text-luxury-white/40">{row.categoryCode}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-luxury-white font-bold">{row.adminScore?.total?.toFixed(1)}</span>
                          <span className="text-luxury-white/40"> / 30.0</span>
                          <span className="block text-[10px] text-luxury-white/30">
                            (Disc: {row.adminScore?.discipline}, Tal: {row.adminScore?.talent})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-luxury-white font-bold">{row.judgeTotal?.toFixed(1)}</span>
                          <span className="text-luxury-white/40"> / {row.judgeMax}</span>
                          <span className="block text-[10px] text-luxury-white/30">
                            {row.judgeScores?.length || 0} evaluations
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-luxury-gold font-bold text-base">
                            {row.finalScore?.toFixed(1)}
                          </span>
                          <span className="text-luxury-white/40"> / {row.maxMarks}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-sans text-[9px] tracking-luxury uppercase font-bold px-2 py-0.5 border ${
                              row.completionStatus === 'COMPLETE'
                                ? 'text-green-400 border-green-500/30 bg-green-500/5'
                                : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5'
                            }`}
                          >
                            {row.completionStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 pr-6">
                          <Link href={`/contestants/${row.contestantId}`}>
                            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:underline uppercase font-bold">
                              Profile & Score ↗
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : activeTab === 'LEDGER' ? (
        /* TAB 2: ROUND EVALUATION LEDGER & UNLOCK CONSOLE */
        <div className="space-y-6">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by Contestant ID..."
                value={contestantSearch}
                onChange={(e) => setContestantSearch(e.target.value)}
                className="flex-1 h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-sm text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40 transition-colors"
              />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[160px]"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedLockStatus}
                onChange={(e) => setSelectedLockStatus(e.target.value)}
                className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="true">Locked</option>
                <option value="false">Draft / Unlocked</option>
              </select>
            </div>
          </Card>

          {error && <p className="font-sans text-sm text-red-400">{error}</p>}

          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-luxury-gray-border/10 rounded" />
                ))}
              </div>
            ) : scores.length === 0 ? (
              <div className="p-16 text-center">
                <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
                  NO SCORE EVALUATIONS FOUND
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-luxury-gray-border/10">
                      {['Contestant ID', 'Event / Category', 'Round', 'Judge', 'Score', 'Status', 'Submitted', 'Actions'].map(
                        (h) => (
                          <th
                            key={h}
                            className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors"
                      >
                        <td className="py-3 px-4 pl-6 font-mono text-xs font-bold text-luxury-white">
                          {s.contestantId}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-luxury-white/70">
                          {s.round?.category?.name || '—'}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-luxury-white/60">
                          {s.round?.name || '—'}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-luxury-gold/80 font-medium">
                          {s.judge?.name || 'Admin'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-luxury-gold">
                          {Number(s.value).toFixed(2)} / {s.round?.maxMarks || 50}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                              s.locked ? 'text-green-400' : 'text-yellow-400'
                            }`}
                          >
                            {s.locked ? 'LOCKED' : 'DRAFT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-luxury-white/40">
                          {new Date(s.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 pr-6">
                          <button
                            onClick={() => setSelectedScoreModal(s)}
                            className="font-sans text-[10px] tracking-luxury text-luxury-gold/70 hover:text-luxury-gold uppercase font-bold mr-3"
                          >
                            CRITERIA ↗
                          </button>

                          {s.locked ? (
                            <button
                              disabled={actionLoadingId === s.id}
                              onClick={() => setUnlockConfirmScore(s)}
                              className="font-sans text-[10px] tracking-luxury text-yellow-400/80 hover:text-yellow-300 uppercase font-bold border border-yellow-500/30 px-2 py-0.5 bg-yellow-500/10"
                            >
                              {actionLoadingId === s.id ? '...' : 'UNLOCK 🔓'}
                            </button>
                          ) : (
                            <button
                              disabled={actionLoadingId === s.id}
                              onClick={() => handleLockScore(s.id)}
                              className="font-sans text-[10px] tracking-luxury text-red-400 hover:text-red-300 uppercase font-bold border border-red-500/30 px-2 py-0.5 bg-red-500/10"
                            >
                              {actionLoadingId === s.id ? '...' : 'LOCK 🔒'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 pb-4">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPageChange={(p) => fetchScores(p)}
              />
            </div>
          </Card>
        </div>
      ) : (
        /* TAB 3: ROUND STANDINGS & RANKINGS (Phase 6F) */
        <div className="space-y-6">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={standingsEventId}
                onChange={(e) => setStandingsEventId(e.target.value)}
                className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white uppercase tracking-luxury outline-none focus:border-luxury-gold/40 flex-1"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <select
                value={standingsCategoryId}
                onChange={(e) => setStandingsCategoryId(e.target.value)}
                className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 flex-1"
              >
                <option value="">Select Category</option>
                {standingsCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <select
                value={standingsRoundId}
                onChange={(e) => setStandingsRoundId(e.target.value)}
                className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 flex-1"
              >
                <option value="">Select Round</option>
                {standingsRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.status})
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
            {standingsLoading ? (
              <div className="p-8 text-center text-luxury-white/40 font-sans text-xs">
                LOADING ROUND STANDINGS...
              </div>
            ) : !roundStandingsData || !roundStandingsData.standings || roundStandingsData.standings.length === 0 ? (
              <div className="p-16 text-center">
                <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
                  NO ROUND RESULTS AVAILABLE
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="p-4 bg-[#070707] border-b border-luxury-gray-border/10 flex justify-between items-center">
                  <div>
                    <span className="font-sans text-xs font-bold text-luxury-gold uppercase tracking-wider">
                      {roundStandingsData.round?.name} — {roundStandingsData.round?.category?.name}
                    </span>
                    <span className="ml-3 font-mono text-[10px] text-luxury-white/40">
                      MAX: {roundStandingsData.round?.maxMarks} PTS
                    </span>
                  </div>
                  <span className="font-sans text-[10px] uppercase tracking-luxury text-green-400 font-bold border border-green-500/30 px-2 py-0.5 bg-green-500/10">
                    STATUS: {roundStandingsData.round?.status}
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-luxury-gray-border/10">
                      {['Rank', 'Contestant ID', 'Category', 'Round', 'Total Score', 'Status'].map((h) => (
                        <th
                          key={h}
                          className="font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase py-3 px-4 first:pl-6 last:pr-6"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roundStandingsData.standings.map((st: any) => (
                      <tr
                        key={st.contestantId}
                        className="border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors"
                      >
                        <td className="py-3 px-4 pl-6 font-mono text-sm font-bold text-luxury-gold">
                          #{st.rank}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-luxury-white">
                          {st.contestantId}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-luxury-white/70">
                          {st.category} ({st.categoryCode})
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-luxury-white/60">
                          {st.round}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm font-bold text-luxury-gold">
                          {Number(st.totalScore).toFixed(2)} / {st.maxMarks} PTS
                        </td>
                        <td className="py-3 px-4 pr-6">
                          <span className="font-sans text-[10px] tracking-luxury uppercase font-bold text-green-400">
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Result Publication Confirmation Modal */}
      {showPubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gold/30 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                ADMINISTRATIVE VERIFICATION
              </span>
              <h3 className="font-serif text-2xl font-light text-luxury-white">
                {isResultsPublished ? 'Unpublish Official Results?' : 'Publish Official Results?'}
              </h3>
            </div>

            <div className="p-4 bg-[#050505] border border-luxury-gray-border/20 space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-luxury-white/50 uppercase">Event:</span>
                <span className="text-luxury-white font-bold">{selectedEventObj?.name || selectedEventId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-luxury-white/50 uppercase">Category:</span>
                <span className="text-luxury-gold font-bold">{finalCategoryFilter || 'All Categories'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-luxury-white/50 uppercase">Total Entrants:</span>
                <span className="text-luxury-white font-bold">{finalScores.length}</span>
              </div>
              {finalScores.length > 0 && (
                <div className="flex justify-between border-t border-luxury-gray-border/10 pt-2">
                  <span className="text-luxury-white/50 uppercase">Rank #1 Top Score:</span>
                  <span className="text-luxury-gold font-bold">{finalScores[0].finalScore} / {finalScores[0].maxMarks}</span>
                </div>
              )}
            </div>

            <p className="font-sans text-xs text-luxury-white/60 leading-relaxed">
              {isResultsPublished
                ? 'Unpublishing will immediately revoke public and contestant visibility of rankings and final scores.'
                : 'Publishing will immediately make official final standings and rank visible on the Public Website and Contestant Portal.'}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowPubModal(false)}>
                CANCEL
              </Button>
              <Button size="sm" variant="solid" disabled={pubLoading} onClick={handleTogglePublish}>
                {pubLoading ? 'SAVING...' : isResultsPublished ? 'CONFIRM UNPUBLISH 🚫' : 'CONFIRM PUBLISH 📢'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Unlock Confirmation Modal */}
      {unlockConfirmScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-yellow-500/40 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <span className="font-sans text-[10px] tracking-luxury text-yellow-500 uppercase font-bold block">
                ADMINISTRATIVE ACTION
              </span>
              <h3 className="font-serif text-2xl font-light text-luxury-white">
                UNLOCK THIS SCORE?
              </h3>
            </div>

            <div className="p-4 bg-[#050505] border border-luxury-gray-border/20 space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-luxury-white/50 uppercase">Contestant:</span>
                <span className="font-mono text-luxury-gold font-bold">{unlockConfirmScore.contestantId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-luxury-white/50 uppercase">Round:</span>
                <span className="text-luxury-white font-bold">{unlockConfirmScore.round?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-luxury-white/50 uppercase">Judge:</span>
                <span className="text-luxury-white font-bold">{unlockConfirmScore.judge?.name || 'Judge'}</span>
              </div>
              <div className="flex justify-between border-t border-luxury-gray-border/10 pt-2">
                <span className="text-luxury-white/50 uppercase">Recorded Score:</span>
                <span className="font-mono text-luxury-gold font-bold">{Number(unlockConfirmScore.value).toFixed(2)} pts</span>
              </div>
            </div>

            <p className="font-sans text-xs text-luxury-white/70 leading-relaxed">
              The Judge will be allowed to edit this exact score. After resubmission it will automatically lock again.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoadingId === unlockConfirmScore.id}
                onClick={() => setUnlockConfirmScore(null)}
              >
                CANCEL
              </Button>
              <Button
                size="sm"
                variant="solid"
                disabled={actionLoadingId === unlockConfirmScore.id}
                onClick={async () => {
                  const id = unlockConfirmScore.id;
                  setUnlockConfirmScore(null);
                  await handleUnlockScore(id);
                }}
              >
                {actionLoadingId === unlockConfirmScore.id ? 'UNLOCKING...' : 'UNLOCK'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Criteria Breakdown Modal */}
      {selectedScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gray-border/30 w-full max-w-lg p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                  EVALUATION BREAKDOWN
                </span>
                <h3 className="font-mono text-xl font-bold text-luxury-white mt-1">
                  {selectedScoreModal.contestantId}
                </h3>
                <span className="font-sans text-xs text-luxury-white/50">
                  {selectedScoreModal.round?.name} — Evaluator: {selectedScoreModal.judge?.name || 'Admin'}
                </span>
              </div>
              <button
                onClick={() => setSelectedScoreModal(null)}
                className="text-luxury-white/40 hover:text-white text-lg font-sans"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <span className="font-sans text-[9px] tracking-luxury text-luxury-white/40 uppercase block">
                INDIVIDUAL CRITERIA MARKS
              </span>
              <div className="space-y-2">
                {Object.entries(selectedScoreModal.subScores || {}).map(([crit, val]: [string, any]) => (
                  <div
                    key={crit}
                    className="p-3 bg-[#050505] border border-luxury-gray-border/20 flex justify-between items-center"
                  >
                    <span className="font-sans text-xs text-luxury-white">{crit}</span>
                    <span className="font-mono text-xs font-bold text-luxury-gold">{Number(val).toFixed(2)} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-black border border-luxury-gold/30 flex justify-between items-center">
              <span className="font-sans text-xs font-bold text-luxury-white uppercase tracking-luxury">
                TOTAL AGGREGATED SCORE
              </span>
              <span className="font-mono text-xl font-bold text-luxury-gold">
                {Number(selectedScoreModal.value).toFixed(2)} / {selectedScoreModal.round?.maxMarks || 50} PTS
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedScoreModal(null)}>
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScoringPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <ScoringContent />
      </AdminShell>
    </AuthGuard>
  );
}
