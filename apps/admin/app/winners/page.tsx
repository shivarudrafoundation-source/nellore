'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

const API = getApiBaseUrl();

function WinnersContent() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  
  const [finalData, setFinalData] = useState<any | null>(null);
  const [publication, setPublication] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // End Final Round Modal State
  const [showEndFinalModal, setShowEndFinalModal] = useState(false);
  const [endingFinalRound, setEndingFinalRound] = useState(false);
  const [endFinalError, setEndFinalError] = useState<any | null>(null);
  const [endFinalSuccess, setEndFinalSuccess] = useState<any | null>(null);

  // Publication Modal State
  const [showPubModal, setShowPubModal] = useState(false);
  const [pubLoading, setPubLoading] = useState(false);

  // 1. Fetch Events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=50`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data || []);
          if (d.data && d.data.length > 0 && !selectedEventId) {
            setSelectedEventId(d.data[0].id);
          }
        }
      } catch {}
    }
    loadEvents();
  }, []);

  // 2. Fetch Categories for Selected Event
  useEffect(() => {
    if (!selectedEventId) return;
    async function loadCategories() {
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${selectedEventId}&limit=50`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setCategories(d.data || []);
        }
      } catch {}
    }
    loadCategories();
  }, [selectedEventId]);

  // 3. Fetch Publication Status
  const fetchPublication = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const params = new URLSearchParams({ eventId: selectedEventId });
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      const res = await fetch(`${API}/admin/scoring/publication-status?${params}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setPublication(d);
      } else {
        setPublication(null);
      }
    } catch {
      setPublication(null);
    }
  }, [selectedEventId, selectedCategoryId]);

  // 4. Fetch Final Results & Winners
  const fetchFinalResults = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      const res = await fetch(`${API}/admin/events/${selectedEventId}/final-results?${params}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setFinalData(d);
      } else {
        setFinalData(null);
      }
    } catch {
      setFinalData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, selectedCategoryId]);

  useEffect(() => {
    fetchPublication();
    fetchFinalResults();
  }, [fetchPublication, fetchFinalResults]);

  // Handle End Final Round Execution
  const handleEndFinalRound = async () => {
    if (!selectedEventId) return;
    setEndingFinalRound(true);
    setEndFinalError(null);
    setEndFinalSuccess(null);
    try {
      const res = await fetch(`${API}/admin/events/${selectedEventId}/end-final-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategoryId || undefined }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setEndFinalError(data);
        return;
      }
      setEndFinalSuccess(data);
      fetchFinalResults();
      fetchPublication();
    } catch (err: any) {
      setEndFinalError({ message: 'FINAL EVENT CANNOT BE COMPLETED YET', error: err.message });
    } finally {
      setEndingFinalRound(false);
    }
  };

  // Handle Publish / Unpublish
  const handleTogglePublication = async (newStatus: boolean) => {
    if (!selectedEventId) return;
    setPubLoading(true);
    try {
      const res = await fetch(`${API}/admin/scoring/publish-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          categoryId: selectedCategoryId || undefined,
          isPublished: newStatus,
        }),
        credentials: 'include',
      });
      if (res.ok) {
        setShowPubModal(false);
        fetchPublication();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPubLoading(false);
    }
  };

  const selectedEventObj = events.find((e) => e.id === selectedEventId);
  const isEventCompleted = selectedEventObj?.status === 'COMPLETED';
  const isResultsPublished = publication?.isPublished === true;

  // Flatten rankings from allCategoryRankings
  const currentRankings: any[] = [];
  const currentWinners: any[] = finalData?.winners || [];

  if (finalData?.allCategoryRankings) {
    if (selectedCategoryId && finalData.allCategoryRankings[selectedCategoryId]) {
      currentRankings.push(...finalData.allCategoryRankings[selectedCategoryId]);
    } else {
      Object.values(finalData.allCategoryRankings).forEach((list: any) => {
        if (Array.isArray(list)) currentRankings.push(...list);
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Winners & Results Board</h2>
          <p className="font-sans text-xs text-luxury-white/40 tracking-luxury uppercase mt-1">
            Official Winner Declaration, Final Standings & Public Publication Control
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => {
              setEndFinalError(null);
              setEndFinalSuccess(null);
              setShowEndFinalModal(true);
            }}
            className="border border-luxury-gold text-black bg-luxury-gold font-bold"
          >
            END FINAL ROUND 👑
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPubModal(true)}
            className={isResultsPublished ? 'border-green-500/50 text-green-400' : 'border-luxury-gold/50 text-luxury-gold'}
          >
            {isResultsPublished ? 'PUBLISHED (MANAGE)' : 'PUBLISH RESULTS 🚀'}
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white uppercase tracking-luxury outline-none focus:border-luxury-gold/40 flex-1"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.status})
                </option>
              ))}
            </select>

            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-4 font-sans text-xs text-luxury-white/70 uppercase tracking-luxury outline-none focus:border-luxury-gold/40 flex-1"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-sans text-[10px] uppercase tracking-luxury text-luxury-white/50">
              STATUS:
            </span>
            <span
              className={`font-sans text-[10px] uppercase tracking-luxury font-bold px-2.5 py-1 border ${
                isResultsPublished
                  ? 'text-green-400 border-green-500/30 bg-green-500/10'
                  : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
              }`}
            >
              {isResultsPublished ? 'RESULTS PUBLIC' : 'NOT PUBLISHED'}
            </span>
          </div>
        </div>
      </Card>

      {/* Official Winners Spotlight */}
      {currentWinners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentWinners
            .filter((w) => !selectedCategoryId || w.categoryId === selectedCategoryId)
            .map((w) => (
              <Card
                key={w.categoryId}
                hoverEffect={false}
                className="bg-gradient-to-b from-[#121212] via-[#0A0A0A] to-[#050505] border-2 border-luxury-gold/50 p-6 space-y-4 shadow-[0_0_50px_rgba(212,175,55,0.1)] relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-sans text-[10px] tracking-[0.25em] text-luxury-gold uppercase font-bold block">
                      OFFICIAL WINNER • RANK #1
                    </span>
                    <h3 className="font-serif text-xl text-luxury-white font-light mt-1">
                      {w.categoryName} ({w.categoryCode})
                    </h3>
                  </div>
                  <span className="font-serif text-3xl text-luxury-gold font-light">👑</span>
                </div>

                <div className="p-4 bg-black border border-luxury-gold/30 flex justify-between items-center">
                  <div>
                    <span className="font-sans text-[9px] tracking-luxury text-luxury-white/40 uppercase block">
                      CONTESTANT ID
                    </span>
                    <span className="font-mono text-xl font-bold text-luxury-white block mt-0.5">
                      {w.winnerContestantId}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-sans text-[9px] tracking-luxury text-luxury-white/40 uppercase block">
                      FINAL SCORE
                    </span>
                    <span className="font-mono text-2xl font-bold text-luxury-gold block mt-0.5">
                      {Number(w.winnerFinalScore).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-sans text-luxury-white/40 uppercase tracking-luxury">
                  <span>Status: {isEventCompleted ? 'OFFICIALLY DECLARED' : 'PROVISIONAL'}</span>
                  <span>Max: {w.winnerMaxMarks} PTS</span>
                </div>
              </Card>
            ))}
        </div>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-10 text-center space-y-3">
          <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
            OFFICIAL WINNER STATUS
          </span>
          <h3 className="font-serif text-lg font-light text-luxury-white">
            No Official Winner Declared Yet
          </h3>
          <p className="font-sans text-xs text-luxury-white/40 max-w-md mx-auto leading-relaxed">
            The official event winner is declared only after an administrator executes <strong className="text-luxury-gold">END FINAL ROUND</strong> and all required scores are locked.
          </p>
        </Card>
      )}

      {/* Complete Final Rankings Ledger */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
        <div className="p-4 bg-[#070707] border-b border-luxury-gray-border/10 flex justify-between items-center">
          <span className="font-sans text-xs font-bold text-luxury-gold uppercase tracking-wider">
            FINAL EVENT RANKINGS LEDGER (ALL CONTESTANTS)
          </span>
          <span className="font-mono text-xs text-luxury-white/40">
            TOTAL CONTESTANTS: {currentRankings.length}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-luxury-white/40 font-sans text-xs">
            LOADING FINAL RANKINGS...
          </div>
        ) : currentRankings.length === 0 ? (
          <div className="p-16 text-center">
            <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
              NO CONTESTANTS OR FINAL RESULTS FOUND
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-luxury-gray-border/10">
                  {['Rank', 'Contestant ID', 'Category', 'Admin Score', 'Judge Score', 'Final Score', 'Status'].map(
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
                {currentRankings.map((r: any) => (
                  <tr
                    key={r.contestantId}
                    className={`border-b border-luxury-gray-border/5 hover:bg-luxury-gold/[0.02] transition-colors ${
                      r.rank === 1 ? 'bg-luxury-gold/[0.04]' : ''
                    }`}
                  >
                    <td className="py-3 px-4 pl-6 font-mono text-sm font-bold text-luxury-gold">
                      {r.rank === 1 ? '👑 #1' : `#${r.rank}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-luxury-white">
                      {r.contestantId}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-luxury-white/70">
                      {r.category} ({r.categoryCode})
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-luxury-white/80">
                      {Number(r.adminScore?.total || 0).toFixed(2)} / {r.adminScore?.maxMarks || 30}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-luxury-white/80">
                      {Number(r.judgeTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm font-bold text-luxury-gold">
                      {Number(r.finalScore).toFixed(2)} / {r.maxMarks} PTS
                    </td>
                    <td className="py-3 px-4 pr-6">
                      <span
                        className={`font-sans text-[10px] tracking-luxury uppercase font-bold ${
                          r.rank === 1 ? 'text-luxury-gold' : 'text-green-400'
                        }`}
                      >
                        {r.rank === 1 && isEventCompleted ? 'OFFICIAL WINNER' : r.status || 'PROVISIONAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* End Final Round Confirmation Modal */}
      {showEndFinalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/50 max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div>
              <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                COMPETITION FINALIZATION
              </span>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide mt-1">
                END FINAL ROUND?
              </h3>
              <p className="font-sans text-xs text-luxury-white/50 tracking-luxury uppercase mt-1">
                {selectedEventObj?.name} {selectedCategoryId ? `• Category: ${categories.find(c => c.id === selectedCategoryId)?.name}` : '• All Categories'}
              </p>
            </div>

            <div className="p-4 bg-black border border-luxury-gray-border/20 text-xs text-luxury-white/70 space-y-2">
              <p>
                This action will finalize the event standings and officially declare the Rank #1 contestant as the official winner.
              </p>
              <p className="text-luxury-gold/80 font-medium">
                Prerequisites: All required rounds must be COMPLETED and all scores must be locked.
              </p>
            </div>

            {endFinalError && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 space-y-2 text-left">
                <p className="font-sans text-xs font-bold text-red-400 tracking-wider uppercase">
                  {endFinalError.message || 'FINAL EVENT CANNOT BE COMPLETED YET'}
                </p>
                {endFinalError.roundsCompleted !== undefined && (
                  <div className="text-[11px] font-mono text-luxury-white/80 space-y-1">
                    <div>Rounds Completed: {endFinalError.roundsCompleted}</div>
                    <div>Rounds Remaining: {endFinalError.roundsRemaining}</div>
                    <div>Total Contestants: {endFinalError.totalContestants}</div>
                    <div className="text-red-400 font-bold">Missing/Unlocked Scores: {endFinalError.missingScores}</div>
                  </div>
                )}
                {endFinalError.error && typeof endFinalError.error === 'string' && (
                  <p className="text-[10px] text-red-300/80">{endFinalError.error}</p>
                )}
              </div>
            )}

            {endFinalSuccess && (
              <div className="p-4 bg-green-950/40 border border-green-500/40 text-center space-y-2">
                <p className="font-sans text-xs font-bold text-green-400 tracking-wider uppercase">
                  EVENT FINALIZED — OFFICIAL WINNER DECLARED
                </p>
                <p className="text-[11px] text-luxury-white/70">
                  Authoritative rankings finalized for {endFinalSuccess.winners?.length || 0} categories.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEndFinalModal(false);
                  setEndFinalError(null);
                  setEndFinalSuccess(null);
                }}
                disabled={endingFinalRound}
              >
                {endFinalSuccess ? 'CLOSE' : 'CANCEL'}
              </Button>
              {!endFinalSuccess && (
                <Button
                  size="sm"
                  onClick={handleEndFinalRound}
                  disabled={endingFinalRound}
                  className="bg-luxury-gold text-black font-bold"
                >
                  {endingFinalRound ? 'FINALIZING EVENT...' : 'CONFIRM & END FINAL ROUND'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Result Publication Modal */}
      {showPubModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/50 max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div>
              <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                PUBLIC RESULT VISIBILITY
              </span>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide mt-1">
                {isResultsPublished ? 'UNPUBLISH FINAL RESULTS?' : 'PUBLISH FINAL RESULTS?'}
              </h3>
            </div>

            <p className="text-xs font-sans text-luxury-white/70 leading-relaxed">
              {isResultsPublished
                ? 'Unpublishing will immediately revoke public and stage visibility of winners and final scores.'
                : 'Publishing will immediately reveal official winners and full standings to the public and stage LED display.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPubModal(false)}
                disabled={pubLoading}
              >
                CANCEL
              </Button>
              <Button
                size="sm"
                onClick={() => handleTogglePublication(!isResultsPublished)}
                disabled={pubLoading}
                className={isResultsPublished ? 'bg-red-500 text-white font-bold' : 'bg-green-500 text-black font-bold'}
              >
                {pubLoading ? 'SAVING...' : isResultsPublished ? 'UNPUBLISH NOW' : 'PUBLISH NOW 🚀'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function WinnersPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <WinnersContent />
      </AdminShell>
    </AuthGuard>
  );
}

