'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRealtimeScores, RealtimeConnectionState } from '../hooks/useRealtimeScores';
import { getApiBaseUrl } from '@srf/ui';

type StageMode = 'STANDBY' | 'LIVE' | 'FINAL' | 'ROUND_RESULTS' | 'RESULTS_NOT_PUBLISHED' | 'EVENT_COMPLETED';

interface LiveScoreData {
  eventId?: string;
  contestantId: string;
  categoryName: string;
  categoryCode?: string;
  roundName: string;
  roundMaxMarks: number;
  totalScore: number;
  status: 'DRAFT' | 'LOCKED';
  timestamp: string;
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

  // Live score state - Initialized to null and populated from DB on mount + live WebSockets
  const [activeScore, setActiveScore] = useState<LiveScoreData | null>(null);
  const [recentScores, setRecentScores] = useState<LiveScoreData[]>([]);
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

  // 2. Fetch latest live stage data from DB whenever selectedEvent changes
  useEffect(() => {
    if (!selectedEvent) return;
    async function loadLiveStageData() {
      try {
        const slug = selectedEvent.code || selectedEvent.id;
        const res = await fetch(`${API}/public/events/${slug}/live-stage`);
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
          if (data.recentScores && data.recentScores.length > 0) {
            setRecentScores(data.recentScores);
          }
        }
      } catch (err) {
        console.error('Failed to load live stage data:', err);
      }
    }
    loadLiveStageData();
  }, [API, selectedEvent]);

  // 3. Fetch publication & results status
  const checkPublishedResults = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const slug = selectedEvent.code || selectedEvent.id;
      const res = await fetch(`${API}/public/events/${slug}/winners`);
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

  // 4. Realtime Live Score Handler (Strict Zero-PII, Stale Data Protection)
  const handleRealtimeScore = useCallback((event: any) => {
    // Stale data protection: ensure event timestamp is newer or equal
    const eventTime = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
    if (eventTime < lastEventTimestampRef.current) {
      return; // Ignore stale event
    }
    lastEventTimestampRef.current = eventTime;

    if (event.type === 'EVENT_FINALIZED') {
      if (event.winners && event.winners.length > 0) {
        setWinners(
          event.winners.map((w: any) => ({
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

    const newScore: LiveScoreData = {
      eventId: event.eventId,
      contestantId: event.contestantId,
      categoryName: event.categoryName || 'Competitive Category',
      categoryCode: event.categoryCode || 'CAT',
      roundName: event.roundName || 'Active Evaluation',
      roundMaxMarks: event.roundMaxMarks || 50,
      totalScore: Number(event.totalScore) || 0,
      status: event.status === 'LOCKED' ? 'LOCKED' : 'DRAFT',
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // Smooth transition
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveScore(newScore);
      setStageMode('LIVE');
      setIsTransitioning(false);
    }, 150);

    setRecentScores((prev) => {
      const filtered = prev.filter((s) => s.contestantId !== newScore.contestantId);
      return [newScore, ...filtered.slice(0, 7)];
    });
  }, [checkPublishedResults]);

  // 5. Socket.IO Real-time Connection
  const { connectionState } = useRealtimeScores({
    eventId: selectedEvent?.id,
    role: 'STAGE',
    onScoreEvent: handleRealtimeScore,
  });

  // 6. Fullscreen Management & Keyboard Shortcut ('F')
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

  // 7. Auto-hide Controls after 3 seconds of inactivity
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
    <div className="min-h-screen bg-[#050505] text-luxury-white flex flex-col justify-between overflow-hidden relative select-none font-sans">
      {/* Background Ambience / Subtle LED Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)]" />

      {/* 1. TOP BRAND BANNER */}
      <header className="border-b border-luxury-gold/15 px-8 md:px-16 py-6 flex items-center justify-between z-20 bg-[#070707]/90 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 md:h-16 md:w-16 rounded-full overflow-hidden border border-luxury-gold/40 bg-black flex-shrink-0">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              fill
              className="object-cover scale-105"
              priority
            />
          </div>
          <div>
            <span className="font-serif text-xl md:text-3xl tracking-widest text-luxury-gold uppercase font-light block">
              SIVA RUDRA FOUNDATIONS
            </span>
            <span className="font-sans text-[10px] md:text-xs tracking-[0.3em] text-luxury-white/50 uppercase font-bold block mt-0.5">
              OFFICIAL STAGE & LIVE SCORING ENGINE
            </span>
          </div>
        </div>

        {/* Live Status & Mode Badge */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-xs text-luxury-gold font-bold uppercase tracking-wider">
              {selectedEvent?.name || 'Nellore Nerajana 2026'}
            </span>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury">
              {selectedEvent?.location || 'Nellore Convention Center'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-black border border-luxury-gray-border/30">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionState === 'CONNECTED'
                  ? 'bg-green-500 animate-pulse'
                  : connectionState === 'RECONNECTING'
                    ? 'bg-yellow-500 animate-ping'
                    : 'bg-red-500'
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-luxury-white/80 font-bold">
              {connectionState === 'CONNECTED' ? 'LIVE SYNC' : connectionState}
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN LED WALL STAGE DISPLAY */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 md:px-16 py-8 z-10 w-full max-w-7xl mx-auto">
        {stageMode === 'STANDBY' ? (
          /* MODE A: STANDBY SCREEN */
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="w-20 h-20 rounded-full border border-luxury-gold/30 bg-luxury-gold/5 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(212,175,55,0.1)]">
              <span className="font-serif text-3xl text-luxury-gold">§</span>
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
          <div className="w-full text-center space-y-8 animate-fadeIn">
            <span className="px-6 py-2 bg-luxury-gold text-black font-sans text-xs md:text-sm tracking-[0.3em] uppercase font-bold inline-block shadow-lg">
              OFFICIAL WINNER SPOTLIGHT
            </span>

            <div className="border border-luxury-gold/50 bg-[#0A0A0A] p-8 md:p-16 max-w-3xl mx-auto space-y-6 shadow-[0_0_80px_rgba(212,175,55,0.15)] relative">
              <div className="font-serif text-6xl md:text-8xl text-luxury-gold font-light">
                #1
              </div>

              <div className="space-y-2">
                <span className="font-mono text-4xl md:text-6xl font-bold text-luxury-white tracking-wider block">
                  {winners[0].contestantId}
                </span>
                <span className="font-sans text-sm md:text-base text-luxury-gold uppercase font-bold tracking-luxury block">
                  {winners[0].category} ({winners[0].categoryCode})
                </span>
              </div>

              <div className="pt-4 border-t border-luxury-gold/20 flex justify-center items-baseline gap-2">
                <span className="font-mono text-5xl md:text-7xl font-bold text-luxury-gold">
                  {winners[0].finalScore.toFixed(1)}
                </span>
                <span className="font-mono text-xl md:text-2xl text-luxury-white/40">
                  / {winners[0].maxMarks} PTS
                </span>
              </div>
            </div>
          </div>
        ) : stageMode === 'ROUND_RESULTS' && roundResults ? (
          /* MODE D: ROUND RESULTS */
          <div className="w-full max-w-5xl text-center space-y-6 animate-fadeIn">
            <span className="px-6 py-2 bg-luxury-gold text-black font-sans text-xs md:text-sm tracking-[0.3em] uppercase font-bold inline-block shadow-lg">
              OFFICIAL ROUND RESULTS
            </span>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-luxury-white uppercase tracking-widest font-light">
                {roundResults.categoryName} • {roundResults.roundName}
              </h3>
              <p className="font-mono text-xs text-luxury-gold tracking-widest uppercase">
                MAX MARKS: {roundResults.roundMaxMarks} PTS
              </p>
            </div>

            <div className="border border-luxury-gold/40 bg-[#0A0A0A] p-6 max-w-4xl mx-auto shadow-[0_0_80px_rgba(212,175,55,0.12)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-2">
                {roundResults.standings.map((st) => (
                  <div
                    key={st.contestantId}
                    className="p-4 bg-[#050505] border border-luxury-gray-border/20 flex items-center justify-between hover:border-luxury-gold/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xl font-bold text-luxury-gold w-10 text-left">
                        #{st.rank}
                      </span>
                      <div className="text-left">
                        <span className="font-mono text-base font-bold text-luxury-white block">
                          {st.contestantId}
                        </span>
                        <span className="font-sans text-[10px] text-luxury-white/40 uppercase tracking-wider block">
                          CONTESTANT
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-luxury-gold">
                        {Number(st.score).toFixed(2)}
                      </span>
                      <span className="font-mono text-xs text-luxury-white/40 block">
                        / {st.maxMarks} PTS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* MODE C: LIVE SCORING SCREEN (DEFAULT & ACTIVE) */
          activeScore ? (
            <div
              className={`w-full max-w-5xl transition-opacity duration-300 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {/* Giant Spotlight Card */}
              <div className="border-2 border-luxury-gold/40 bg-gradient-to-b from-[#0F0F0F] via-[#0A0A0A] to-[#050505] p-5 sm:p-8 md:p-14 text-center space-y-6 sm:space-y-8 shadow-[0_0_80px_rgba(212,175,55,0.12)]">
                {/* Category & Round Header */}
                <div className="space-y-2">
                  <span className="font-sans text-xs md:text-sm tracking-[0.3em] text-luxury-gold uppercase font-bold block">
                    STAGE EVALUATION IN PROGRESS
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl md:text-3xl text-luxury-white/80 uppercase tracking-widest font-light">
                    {activeScore.categoryName} • {activeScore.roundName}
                  </h3>
                </div>

                {/* Contestant ID (Responsive LED Display) */}
                <div className="py-2">
                  <span className="font-sans text-[10px] sm:text-[11px] text-luxury-white/40 uppercase tracking-[0.28em] block mb-2 font-bold">
                    ACTIVE CONTESTANT
                  </span>
                  <span className="font-mono text-2xl sm:text-4xl md:text-6xl lg:text-8xl font-bold text-luxury-white tracking-widest block drop-shadow-md break-all sm:break-normal">
                    {activeScore.contestantId}
                  </span>
                </div>

                {/* Live Score Display (High Legibility LED Wall Format) */}
                <div className="inline-block px-6 sm:px-10 py-4 sm:py-6 bg-black border border-luxury-gold/60 shadow-2xl max-w-full">
                  <span className="font-sans text-[9px] sm:text-[10px] md:text-xs tracking-[0.24em] text-luxury-white/40 uppercase block mb-1">
                    OFFICIAL EVALUATION SCORE
                  </span>
                  <div className="flex items-baseline justify-center gap-2 sm:gap-3">
                    <span className="font-mono text-4xl sm:text-6xl md:text-8xl font-bold text-luxury-gold">
                      {Number(activeScore.totalScore).toFixed(2)}
                    </span>
                    <span className="font-mono text-lg sm:text-2xl md:text-3xl text-luxury-white/40 font-normal">
                      / {activeScore.roundMaxMarks} PTS
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div>
                  {activeScore.status === 'LOCKED' ? (
                    <span className="font-sans text-xs md:text-sm tracking-[0.25em] uppercase font-bold text-green-400 border border-green-500/40 px-4 sm:px-6 py-1.5 sm:py-2 bg-green-500/10 inline-block shadow-sm">
                      OFFICIAL SCORE LOCKED
                    </span>
                  ) : (
                    <span className="font-sans text-xs md:text-sm tracking-[0.25em] uppercase font-bold text-yellow-400 border border-yellow-500/40 px-4 sm:px-6 py-1.5 sm:py-2 bg-yellow-500/10 inline-block shadow-sm animate-pulse">
                      LIVE SCORING ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Recent Stage Evaluations Strip */}
              {recentScores.length > 0 && (
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {recentScores.map((sc, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveScore(sc)}
                      className="p-4 bg-[#0A0A0A] border border-luxury-gray-border/20 hover:border-luxury-gold/40 transition-colors cursor-pointer text-left"
                    >
                      <span className="font-mono text-xs font-bold text-luxury-white block">
                        {sc.contestantId}
                      </span>
                      <span className="font-sans text-[10px] text-luxury-white/40 block truncate">
                        {sc.roundName}
                      </span>
                      <span className="font-mono text-sm font-bold text-luxury-gold block mt-1">
                        {Number(sc.totalScore).toFixed(2)} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* AWAITING LIVE SCORE EVALUATION (Clean Standby) */
            <div className="text-center space-y-6 animate-fadeIn border border-luxury-gold/30 bg-[#0A0A0A]/90 p-12 max-w-2xl mx-auto shadow-2xl">
              <div className="w-16 h-16 rounded-full border border-luxury-gold/30 bg-luxury-gold/5 flex items-center justify-center mx-auto shadow-inner">
                <span className="w-3 h-3 rounded-full bg-luxury-gold animate-ping" />
              </div>
              <div className="space-y-2">
                <span className="font-sans text-xs tracking-[0.3em] text-luxury-gold uppercase font-bold block">
                  AWAITING LIVE SCORE EVALUATION
                </span>
                <h3 className="font-serif text-2xl text-luxury-white font-light uppercase">
                  {selectedEvent?.name || 'Nellore Nerajana 2026'}
                </h3>
                <p className="font-sans text-xs text-luxury-white/50 tracking-wider uppercase">
                  Live scores submitted by judges will appear here automatically
                </p>
              </div>
            </div>
          )
        )}
      </main>

      {/* 3. STAGE FOOTER */}
      <footer className="border-t border-luxury-gold/15 px-8 py-4 bg-[#070707]/90 flex items-center justify-between text-xs font-sans text-luxury-white/40 z-20">
        <span className="tracking-luxury uppercase text-[10px]">
          Siva Rudra Foundations • Official Broadcast Feed
        </span>
        <span className="tracking-luxury uppercase text-[10px]">
          Press <kbd className="border border-luxury-gold/40 px-1.5 py-0.5 text-luxury-gold font-mono">F</kbd> for Fullscreen
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
            className="h-9 bg-black/90 border border-luxury-gold/40 text-luxury-gold font-sans text-[10px] px-3 uppercase tracking-luxury outline-none shadow-lg"
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
          className="h-9 bg-black/90 border border-luxury-gold/40 text-luxury-gold font-sans text-[10px] px-3 uppercase tracking-luxury outline-none shadow-lg"
        >
          <option value="LIVE">Live Scoring Mode</option>
          <option value="STANDBY">Standby Mode</option>
          <option value="FINAL">Final Winner Mode</option>
          <option value="ROUND_RESULTS">Round Results Mode</option>
        </select>

        <button
          onClick={toggleFullscreen}
          className="h-9 px-4 bg-luxury-gold text-black font-sans text-[10px] uppercase font-bold tracking-luxury shadow-lg hover:bg-luxury-gold-rich transition-colors"
        >
          {isFullscreen ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN [F]'}
        </button>
      </div>
    </div>
  );
}
