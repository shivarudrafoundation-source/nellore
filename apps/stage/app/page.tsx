'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRealtimeScores } from '../hooks/useRealtimeScores';
import { getApiBaseUrl } from '@srf/ui';

type StageMode = 'STANDBY' | 'LIVE' | 'FINAL' | 'ROUND_RESULTS';

interface LiveActiveScore {
  eventId?: string;
  contestantId: string;
  categoryName: string;
  categoryCode?: string;
  roundName: string;
  roundMaxMarks: number;
  roundScore: number;
  totalCumulativeScore: number;
  availableMaxMarks: number;
  rank: number;
  percentage?: number;
  status: 'DRAFT' | 'LOCKED';
  timestamp: string;
}

interface LeaderboardItem {
  rank: number;
  contestantId: string;
  category: string;
  categoryCode: string;
  cumulativeScore: number;
  availableMaxMarks: number;
  percentage: number;
  adminScore: number;
  judgeTotal: number;
  isKids: boolean;
  allLocked: boolean;
  isLatestUpdated?: boolean;
}

interface WinnerData {
  rank: number;
  contestantId: string;
  category: string;
  categoryCode: string;
  finalScore: number;
  maxMarks: number;
}

interface RoundStandingsData {
  roundName: string;
  categoryName: string;
  roundMaxMarks: number;
  standings: Array<{
    rank: number;
    contestantId: string;
    score: number;
    maxMarks: number;
  }>;
}

export default function StageLiveDisplay() {
  const API = getApiBaseUrl();
  const [stageMode, setStageMode] = useState<StageMode>('LIVE');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [roundResults, setRoundResults] = useState<RoundStandingsData | null>(null);

  // Live state
  const [activeScore, setActiveScore] = useState<LiveActiveScore | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [winners, setWinners] = useState<WinnerData[]>([]);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimestampRef = useRef<number>(0);

  // 1. Fetch public events list
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/public/events`);
        if (res.ok) {
          const list = await res.json();
          setEvents(list);
          if (list.length > 0 && !selectedEvent) {
            setSelectedEvent(list[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      }
    }
    loadEvents();
  }, [API, selectedEvent]);

  // 2. Fetch latest live stage data (Active Score + Descending Leaderboard)
  const loadLiveStageData = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const slug = selectedEvent.code || selectedEvent.id;
      const res = await fetch(`${API}/public/events/${slug}/live-stage`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();

        if (data.activeScore) {
          setActiveScore(data.activeScore);
          const scoreTime = new Date(data.activeScore.timestamp).getTime();
          if (scoreTime > lastEventTimestampRef.current) {
            lastEventTimestampRef.current = scoreTime;
          }
        } else {
          setActiveScore(null);
        }

        if (data.leaderboard && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      }
    } catch (err) {
      console.error('Failed to load live stage data:', err);
    }
  }, [API, selectedEvent]);

  // Initial load on event change
  useEffect(() => {
    loadLiveStageData();
  }, [loadLiveStageData]);

  // 3. High-Speed 2.5-Second Background Poller (Ensures 100% Real-Time Live Sync without clicking refresh)
  useEffect(() => {
    if (!selectedEvent) return;
    const interval = setInterval(() => {
      loadLiveStageData();
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedEvent, loadLiveStageData]);

  // 4. Fetch publication & results status
  const checkPublishedResults = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const slug = selectedEvent.code || selectedEvent.id;
      const res = await fetch(`${API}/public/events/${slug}/winners`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.isPublished && data.winners && data.winners.length > 0) {
          setWinners(data.winners);
        }
      }
    } catch {}
  }, [API, selectedEvent]);

  useEffect(() => {
    checkPublishedResults();
  }, [checkPublishedResults]);

  // 5. Realtime WebSocket Push Handler (Instant updates)
  const handleRealtimeScore = useCallback((event: any) => {
    const eventTime = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
    if (eventTime < lastEventTimestampRef.current) {
      return;
    }
    lastEventTimestampRef.current = eventTime;

    if (event.type === 'EVENT_FINALIZED') {
      if (event.winners && event.winners.length > 0) {
        setWinners(
          event.winners.map((w: any) => ({
            rank: w.rank || 1,
            contestantId: w.winnerContestantId || w.contestantId,
            category: w.categoryName || w.category,
            categoryCode: w.categoryCode || 'CAT',
            finalScore: Number(w.winnerFinalScore || w.finalScore || 0),
            maxMarks: w.winnerMaxMarks || w.maxMarks || 230,
          })),
        );
        setStageMode('FINAL');
      }
      return;
    }

    if (event.type === 'RESULTS_PUBLISHED') {
      if (event.winners && event.winners.length > 0) {
        setWinners(
          event.winners.map((w: any) => ({
            rank: w.rank || 1,
            contestantId: w.winnerContestantId || w.contestantId,
            category: w.categoryName || w.category,
            categoryCode: w.categoryCode || 'CAT',
            finalScore: Number(w.winnerFinalScore || w.finalScore || 0),
            maxMarks: w.winnerMaxMarks || w.maxMarks || 230,
          })),
        );
      } else {
        checkPublishedResults();
      }
      setStageMode('FINAL');
      return;
    }

    if (event.type === 'RESULTS_UNPUBLISHED') {
      setWinners([]);
      setStageMode('STANDBY');
      return;
    }

    if (event.type === 'ROUND_ENDED') {
      setRoundResults({
        roundName: event.roundName || 'Competitive Round',
        categoryName: event.categoryName || 'Category',
        roundMaxMarks: event.roundMaxMarks || 50,
        standings: event.standings || [],
      });
      setStageMode('ROUND_RESULTS');
      return;
    }

    // Trigger immediate refresh from server to get accurate cumulative scores and re-sorted leaderboard
    loadLiveStageData();
  }, [checkPublishedResults, loadLiveStageData]);

  // 6. Socket.IO Real-time Connection
  const { connectionState } = useRealtimeScores({
    eventId: selectedEvent?.id,
    role: 'STAGE',
    onScoreEvent: handleRealtimeScore,
  });

  // 7. Fullscreen Management & Keyboard Shortcut ('F')
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // 8. Auto-hide Controls after 3 seconds of inactivity
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    handleUserActivity();

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleUserActivity]);

  return (
    <div className="min-h-screen bg-[#040404] text-luxury-white flex flex-col justify-between overflow-x-hidden relative select-none font-sans">
      {/* Background Ambience / Subtle LED Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.06)_0%,transparent_60%)]" />

      {/* 1. TOP BRAND BANNER */}
      <header className="border-b border-luxury-gold/25 px-6 md:px-12 py-4 flex items-center justify-between z-20 bg-[#070707]/95 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 md:h-14 md:w-14 rounded-full overflow-hidden border-2 border-luxury-gold bg-black flex-shrink-0 shadow-lg">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              fill
              className="object-cover scale-105"
              priority
            />
          </div>
          <div>
            <span className="font-serif text-lg md:text-2xl tracking-widest text-luxury-gold uppercase font-bold block">
              SIVA RUDRA FOUNDATIONS
            </span>
            <span className="font-sans text-[9px] md:text-[11px] tracking-[0.28em] text-luxury-white/60 uppercase font-extrabold block mt-0.5">
              OFFICIAL STAGE & LIVE SCORING LED BROADCAST
            </span>
          </div>
        </div>

        {/* Live Status & Event Badge */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-xs md:text-sm text-luxury-gold font-black uppercase tracking-wider">
              {selectedEvent?.name || 'Nellore Nerajana 2026'}
            </span>
            <span className="font-sans text-[9px] text-luxury-white/50 uppercase tracking-widest font-semibold">
              📍 {selectedEvent?.location || 'Nellore, Andhra Pradesh'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black/80 border border-luxury-gold/50 rounded-full shadow-inner">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionState === 'CONNECTED'
                  ? 'bg-green-400 animate-pulse'
                  : 'bg-yellow-400 animate-ping'
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-green-400 font-black">
              LIVE SYNC ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN LED WALL STAGE DISPLAY */}
      <main className="flex-1 flex flex-col justify-start items-center px-4 md:px-12 py-6 z-10 w-full max-w-7xl mx-auto space-y-8">
        {stageMode === 'STANDBY' ? (
          /* MODE A: STANDBY SCREEN */
          <div className="text-center space-y-8 my-auto animate-fadeIn py-16">
            <div className="w-24 h-24 rounded-full border-2 border-luxury-gold/40 bg-luxury-gold/10 flex items-center justify-center mx-auto shadow-[0_0_80px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-4xl text-luxury-gold">★</span>
            </div>

            <div className="space-y-3">
              <span className="font-sans text-xs md:text-sm tracking-[0.4em] text-luxury-gold uppercase font-bold block">
                LIVE BROADCAST STANDBY
              </span>
              <h2 className="font-serif text-4xl md:text-6xl text-luxury-white font-light tracking-wide uppercase">
                {selectedEvent?.name || 'Nellore Nerajana Pageant'}
              </h2>
              <p className="font-sans text-xs md:text-sm text-luxury-white/50 max-w-lg mx-auto uppercase tracking-luxury">
                Awaiting Next Competitive Round Broadcast
              </p>
            </div>
          </div>
        ) : stageMode === 'FINAL' && winners.length > 0 ? (
          /* MODE B: FINAL WINNER SPOTLIGHT */
          <div className="w-full text-center space-y-8 my-auto animate-fadeIn py-8">
            <span className="px-8 py-2.5 bg-luxury-gold text-black font-sans text-xs md:text-sm tracking-[0.3em] uppercase font-black inline-block shadow-2xl rounded-sm">
              👑 OFFICIAL WINNER SPOTLIGHT 👑
            </span>

            <div className="border-2 border-luxury-gold bg-[#0A0A0A] p-8 md:p-14 max-w-3xl mx-auto space-y-6 shadow-[0_0_100px_rgba(212,175,55,0.3)] relative rounded-2xl">
              <div className="font-serif text-6xl md:text-8xl text-luxury-gold font-light">
                #1
              </div>

              <div className="space-y-2">
                <span className="font-mono text-4xl md:text-6xl font-black text-luxury-white tracking-wider block">
                  {winners[0].contestantId}
                </span>
                <span className="font-sans text-sm md:text-base text-luxury-gold uppercase font-bold tracking-luxury block">
                  {winners[0].category} ({winners[0].categoryCode})
                </span>
              </div>

              <div className="pt-4 border-t border-luxury-gold/30 flex justify-center items-baseline gap-2">
                <span className="font-mono text-5xl md:text-7xl font-black text-luxury-gold">
                  {winners[0].finalScore.toFixed(2)}
                </span>
                <span className="font-mono text-xl md:text-2xl text-luxury-white/50">
                  / {winners[0].maxMarks} PTS
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* MODE C: LIVE SCORING SCREEN (DEFAULT & ACTIVE) */
          <div className="w-full space-y-8 animate-fadeIn">
            {/* TOP SECTION: ACTIVE CONTESTANT SPOTLIGHT WITH BIG CUMULATIVE TOTAL SCORE */}
            {activeScore ? (
              <div className="border-2 border-luxury-gold/70 bg-gradient-to-b from-[#141414] via-[#0A0A0A] to-[#040404] p-6 md:p-10 text-center space-y-6 shadow-[0_0_90px_rgba(212,175,55,0.22)] rounded-2xl relative overflow-hidden">
                {/* Subtle Radial Glow */}
                <div className="absolute top-0 right-1/4 w-72 h-72 bg-luxury-gold/10 filter blur-3xl rounded-full pointer-events-none" />

                {/* Division & Category Header */}
                <div className="space-y-1.5">
                  <span className="font-sans text-xs md:text-sm tracking-[0.3em] text-luxury-gold uppercase font-extrabold block">
                    STAGE EVALUATION IN PROGRESS
                  </span>
                  <div className="inline-block px-4 py-1 bg-luxury-gold/15 border border-luxury-gold/50 rounded-full">
                    <span className="font-serif text-sm md:text-base text-luxury-white font-bold uppercase tracking-widest">
                      {activeScore.categoryName} {activeScore.categoryCode ? `(${activeScore.categoryCode})` : ''}
                    </span>
                  </div>
                </div>

                {/* Contestant ID / Number (Gigantic LED Display) */}
                <div className="py-1">
                  <span className="font-sans text-[10px] sm:text-xs text-luxury-white/50 uppercase tracking-[0.3em] block mb-1 font-bold">
                    ★ ACTIVE CONTESTANT ON STAGE ★
                  </span>
                  <div className="font-mono text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-widest block drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] break-words">
                    {activeScore.contestantId}
                  </div>
                </div>

                {/* BIG HERO CUMULATIVE TOTAL SCORE BOX */}
                <div className="inline-block w-full max-w-2xl px-6 sm:px-12 py-5 sm:py-7 bg-gradient-to-b from-[#0F0F0F] via-black to-[#050505] border-2 border-luxury-gold shadow-2xl rounded-xl">
                  <span className="font-mono text-xs sm:text-sm md:text-base tracking-[0.3em] text-luxury-gold uppercase block font-black mb-1">
                    CUMULATIVE TOTAL SCORE
                  </span>

                  <div className="flex items-baseline justify-center gap-2 sm:gap-4 my-1">
                    <span className="font-mono text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-luxury-gold drop-shadow-[0_2px_12px_rgba(212,175,55,0.4)]">
                      {Number(activeScore.totalCumulativeScore).toFixed(2)}
                    </span>
                    <span className="font-mono text-xl sm:text-3xl md:text-4xl text-luxury-white/40 font-bold">
                      / {activeScore.availableMaxMarks} PTS
                    </span>
                  </div>

                  {/* Latest Round & Standing Indicators */}
                  <div className="pt-3 mt-3 border-t border-luxury-gold/20 flex flex-wrap items-center justify-center gap-4 text-xs font-sans">
                    <span className="px-3 py-1 bg-luxury-gold/10 border border-luxury-gold/40 text-luxury-gold font-bold uppercase rounded">
                      ★ Current Rank: #{activeScore.rank}
                    </span>
                    {activeScore.roundName && (
                      <span className="text-luxury-white/60">
                        Latest: <strong className="text-white">{activeScore.roundName}</strong> (+{Number(activeScore.roundScore).toFixed(2)} pts)
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div>
                  {activeScore.status === 'LOCKED' ? (
                    <span className="font-sans text-xs md:text-sm tracking-[0.25em] uppercase font-black text-green-400 border border-green-500/50 px-6 py-2 bg-green-500/15 inline-block shadow-md rounded-full">
                      ✓ OFFICIAL SCORE LOCKED
                    </span>
                  ) : (
                    <span className="font-sans text-xs md:text-sm tracking-[0.25em] uppercase font-black text-yellow-400 border border-yellow-500/50 px-6 py-2 bg-yellow-500/15 inline-block shadow-md rounded-full animate-pulse">
                      ● LIVE SCORING ACTIVE
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-luxury-gold/30 bg-[#0A0A0A] p-12 text-center rounded-2xl shadow-xl">
                <span className="font-serif text-2xl text-luxury-gold uppercase block font-light">
                  Awaiting First Live Evaluation
                </span>
                <span className="text-xs text-white/50 uppercase tracking-widest mt-1 block">
                  Scores submitted by judges and admin will appear here in real-time
                </span>
              </div>
            )}

            {/* BOTTOM SECTION: ALL CONTESTANTS / KIDS LEADERBOARD IN DESCENDING ORDER */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-luxury-gold/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg text-luxury-gold">🏆</span>
                  <h3 className="font-sans text-sm sm:text-base font-black text-luxury-gold uppercase tracking-[0.24em]">
                    LIVE CONTESTANT STANDINGS & LEADERBOARD (DESCENDING RANK)
                  </h3>
                </div>
                <span className="font-mono text-xs text-luxury-white/50 uppercase">
                  {leaderboard.length} Accredited Contestants
                </span>
              </div>

              {leaderboard.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {leaderboard.map((item) => {
                    const isRank1 = item.rank === 1;
                    const isRank2 = item.rank === 2;
                    const isRank3 = item.rank === 3;
                    const isActiveOnStage = activeScore?.contestantId === item.contestantId;

                    return (
                      <div
                        key={item.contestantId}
                        onClick={() => {
                          // Click to spotlight on stage if needed
                          setActiveScore((prev: any) => ({
                            ...prev,
                            contestantId: item.contestantId,
                            categoryName: item.category,
                            categoryCode: item.categoryCode,
                            totalCumulativeScore: item.cumulativeScore,
                            availableMaxMarks: item.availableMaxMarks,
                            rank: item.rank,
                            roundScore: item.cumulativeScore,
                            roundName: 'Cumulative Standing',
                            roundMaxMarks: item.availableMaxMarks,
                            status: item.allLocked ? 'LOCKED' : 'DRAFT',
                            timestamp: new Date().toISOString(),
                          }));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left relative overflow-hidden ${
                          isActiveOnStage
                            ? 'bg-luxury-gold/20 border-luxury-gold shadow-[0_0_30px_rgba(212,175,55,0.35)] scale-[1.02]'
                            : isRank1
                              ? 'bg-[#121008] border-luxury-gold/60 shadow-lg'
                              : isRank2
                                ? 'bg-[#0E0E0E] border-white/40 shadow-md'
                                : isRank3
                                  ? 'bg-[#0E0C09] border-[#CD7F32]/50 shadow-md'
                                  : 'bg-[#080808] border-luxury-gray-border/30 hover:border-luxury-gold/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-sm sm:text-base font-black px-2.5 py-0.5 rounded ${
                                isRank1
                                  ? 'bg-luxury-gold text-black font-black shadow-sm'
                                  : isRank2
                                    ? 'bg-white/80 text-black font-black'
                                    : isRank3
                                      ? 'bg-[#CD7F32] text-black font-black'
                                      : 'bg-black border border-luxury-gold/30 text-luxury-gold'
                              }`}
                            >
                              #{item.rank}
                            </span>
                            <span className="font-sans text-[10px] uppercase font-bold text-luxury-gold/80 truncate">
                              {item.category}
                            </span>
                          </div>

                          {item.allLocked && (
                            <span className="text-[9px] font-mono text-green-400 font-bold uppercase">
                              ✓ LOCKED
                            </span>
                          )}
                        </div>

                        {/* Contestant ID */}
                        <div className="font-mono text-lg sm:text-xl font-black text-white tracking-wider truncate mb-2">
                          {item.contestantId}
                        </div>

                        {/* Cumulative Total Score */}
                        <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                          <span className="font-sans text-[10px] text-luxury-white/50 uppercase tracking-wider font-semibold">
                            TOTAL SCORE
                          </span>
                          <div className="text-right">
                            <span className="font-mono text-xl sm:text-2xl font-black text-luxury-gold">
                              {Number(item.cumulativeScore).toFixed(2)}
                            </span>
                            <span className="font-mono text-xs text-luxury-white/40 ml-1">
                              / {item.availableMaxMarks}
                            </span>
                          </div>
                        </div>

                        {/* Score Breakdown Pill */}
                        <div className="mt-2 text-[9px] font-mono text-white/40 flex justify-between">
                          <span>Admin: {item.adminScore.toFixed(1)}</span>
                          <span>Judges: {item.judgeTotal.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#070707] border border-luxury-gray-border/20 rounded-xl text-white/40 text-xs uppercase tracking-wider">
                  No evaluated contestants yet. Live scores will populate as judges submit marks.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. STAGE FOOTER */}
      <footer className="border-t border-luxury-gold/20 px-8 py-3 bg-[#070707]/95 flex items-center justify-between text-xs font-sans text-luxury-white/50 z-20">
        <span className="tracking-luxury uppercase text-[10px] font-semibold">
          Siva Rudra Foundations • Official LED Screen Broadcast
        </span>
        <span className="tracking-luxury uppercase text-[10px]">
          Press <kbd className="border border-luxury-gold/50 px-1.5 py-0.5 text-luxury-gold font-mono font-bold">F</kbd> for Fullscreen LED Mode
        </span>
      </footer>

      {/* 4. FLOATING OPERATOR CONTROLS (Auto-hides on inactivity) */}
      <div
        className={`fixed bottom-14 right-6 z-50 flex items-center gap-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {events.length > 1 && (
          <select
            value={selectedEvent?.id || ''}
            onChange={(e) => {
              const ev = events.find((x) => x.id === e.target.value);
              if (ev) setSelectedEvent(ev);
            }}
            className="h-9 bg-black/95 border border-luxury-gold/50 text-luxury-gold font-sans text-[10px] px-3 uppercase tracking-luxury outline-none shadow-xl rounded"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={stageMode}
          onChange={(e) => setStageMode(e.target.value as StageMode)}
          className="h-9 bg-black/95 border border-luxury-gold/50 text-luxury-gold font-sans text-[10px] px-3 uppercase tracking-luxury outline-none shadow-xl rounded"
        >
          <option value="LIVE">Live Scoring Mode</option>
          <option value="STANDBY">Standby Mode</option>
          <option value="FINAL">Final Winner Mode</option>
        </select>

        <button
          onClick={toggleFullscreen}
          className="h-9 px-4 bg-luxury-gold text-black font-sans text-[10px] uppercase font-black tracking-luxury shadow-xl hover:bg-luxury-gold-rich transition-colors rounded"
        >
          {isFullscreen ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN [F]'}
        </button>
      </div>
    </div>
  );
}
