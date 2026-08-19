'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PublicResultItem {
  rank: number;
  contestantId: string;
  category: string;
  categoryCode: string;
  finalScore: number;
  maxMarks: number;
  isKids: boolean;
  adminTotal: number;
  judgeTotal: number;
}

interface ResultsResponse {
  status: string;
  isPublished: boolean;
  message?: string;
  event?: {
    id: string;
    name: string;
    code: string;
  };
  results: PublicResultItem[];
}

type FetchState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR';

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlEvent = searchParams.get('event') || '';
  const urlCategory = searchParams.get('category') || '';

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventSlug, setSelectedEventSlug] = useState<string>(urlEvent);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);

  const [fetchState, setFetchState] = useState<FetchState>('IDLE');
  const [resultsData, setResultsData] = useState<ResultsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Active in-flight AbortController and sequence counter for race-condition prevention
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Sync state when browser Back / Forward changes URL params
  useEffect(() => {
    if (urlEvent && urlEvent !== selectedEventSlug) {
      setSelectedEventSlug(urlEvent);
    }
    if (urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [urlEvent, urlCategory]);

  // 1. Fetch available public events on mount
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    async function loadEvents() {
      try {
        const res = await fetch(`${API}/public/events`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const evList = Array.isArray(data) ? data : data.events || [];
          setEvents(evList);

          // If no event selected, default to the first event or URL event
          if (evList.length > 0 && !selectedEventSlug) {
            const initialSlug = urlEvent || evList[0].code || evList[0].id;
            setSelectedEventSlug(initialSlug);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load public events:', err);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    loadEvents();
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // 2. Fetch categories when selected event changes
  useEffect(() => {
    if (!selectedEventSlug) {
      setCategories([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    async function loadCategories() {
      try {
        const res = await fetch(`${API}/public/events/${selectedEventSlug}/categories`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const cats = await res.json();
          setCategories(Array.isArray(cats) ? cats : []);
        } else {
          setCategories([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load categories:', err);
          setCategories([]);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    loadCategories();
    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [selectedEventSlug]);

  // 3. Fetch results for event & category with AbortController and strict Request ID sequence
  const fetchResults = useCallback(async () => {
    if (!selectedEventSlug) {
      setFetchState('IDLE');
      setResultsData(null);
      return;
    }

    // Cancel any previous pending request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const currentRequestId = ++activeRequestIdRef.current;
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    setFetchState('LOADING');
    setErrorMessage('');

    try {
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.set('categoryId', selectedCategory);
      }

      const url = `${API}/public/events/${encodeURIComponent(selectedEventSlug)}/results?${params.toString()}`;
      const res = await fetch(url, { signal: controller.signal });

      if (currentRequestId !== activeRequestIdRef.current) {
        // Obsolete response: user has already switched to another category
        return;
      }

      if (!res.ok) {
        if (res.status === 404) {
          setFetchState('EMPTY');
          setResultsData(null);
          return;
        }
        throw new Error('Official results are temporarily unavailable. Please try again.');
      }

      const data: ResultsResponse = await res.json();

      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      setResultsData(data);

      if (!data.isPublished) {
        setFetchState('EMPTY');
      } else if (!data.results || data.results.length === 0) {
        setFetchState('EMPTY');
      } else {
        setFetchState('SUCCESS');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled intentionally by a newer user selection or timeout
        return;
      }
      if (currentRequestId === activeRequestIdRef.current) {
        setErrorMessage(err.message || 'Unable to load results. Please check your network connection.');
        setFetchState('ERROR');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [selectedEventSlug, selectedCategory]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Handle Event Selection with URL update
  const handleEventChange = (newSlug: string) => {
    setSelectedEventSlug(newSlug);
    setSelectedCategory('');
    const params = new URLSearchParams();
    if (newSlug) params.set('event', newSlug);
    router.replace(`/results?${params.toString()}`, { scroll: false });
  };

  // Handle Category Filter with URL update
  const handleCategoryChange = (newCategoryId: string) => {
    setSelectedCategory(newCategoryId);
    const params = new URLSearchParams();
    if (selectedEventSlug) params.set('event', selectedEventSlug);
    if (newCategoryId) params.set('category', newCategoryId);
    router.replace(`/results?${params.toString()}`, { scroll: false });
  };

  const isPublished = resultsData?.isPublished;
  const results = resultsData?.results || [];
  const winner = isPublished && results.length > 0 ? results[0] : null;

  return (
    <div className="min-h-screen bg-[#050505] text-luxury-white flex flex-col justify-between selection:bg-luxury-gold selection:text-black">
      <Header />

      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-6xl mx-auto w-full space-y-12">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <span className="font-sans text-[10px] tracking-[0.28em] text-luxury-gold uppercase font-bold block">
            OFFICIAL CLASSIFICATION & STANDINGS
          </span>
          <h1 className="font-serif text-3xl md:text-5xl font-light tracking-wide uppercase text-luxury-white">
            Event Results & Winners
          </h1>
          <p className="font-sans text-xs text-luxury-white/50 max-w-xl mx-auto uppercase tracking-luxury">
            Certified Scoring Matrix by Siva Rudra Foundations
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-6 bg-[#0A0A0A] border border-luxury-gray-border/20 flex flex-col md:flex-row gap-6 items-stretch md:items-center justify-between">
          {/* Event Selector */}
          <div className="flex-1">
            <label className="block font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury mb-1.5 font-semibold">
              Select Competition Event
            </label>
            {events.length === 0 ? (
              <div className="h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 flex items-center font-sans text-xs text-luxury-white/40 uppercase">
                NO ACTIVE EVENTS FOUND
              </div>
            ) : (
              <select
                value={selectedEventSlug}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full h-10 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white uppercase tracking-luxury outline-none focus:border-luxury-gold/50 cursor-pointer transition-colors"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.code || ev.id}>
                    {ev.name} ({ev.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="space-y-1.5">
            <label className="block font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury font-semibold">
              Filter by Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('')}
                className={`px-3 py-1.5 font-sans text-[10px] tracking-luxury uppercase border transition-all duration-200 cursor-pointer ${
                  selectedCategory === ''
                    ? 'border-luxury-gold bg-luxury-gold/15 text-luxury-gold font-bold shadow-sm'
                    : 'border-luxury-gray-border/20 text-luxury-white/60 hover:text-white hover:border-luxury-white/40'
                }`}
              >
                ALL
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-1.5 font-sans text-[10px] tracking-luxury uppercase border transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'border-luxury-gold bg-luxury-gold/15 text-luxury-gold font-bold shadow-sm'
                      : 'border-luxury-gray-border/20 text-luxury-white/60 hover:text-white hover:border-luxury-white/40'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content Area: LOADING / ERROR / EMPTY / SUCCESS */}
        {fetchState === 'LOADING' && (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 bg-[#0A0A0A] border border-luxury-gray-border/10 rounded flex items-center justify-center">
              <div className="flex items-center space-x-3 text-luxury-gold/60 font-sans text-xs tracking-widest uppercase">
                <svg className="animate-spin h-5 w-5 text-luxury-gold" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading Certified Results...</span>
              </div>
            </div>
            <div className="h-64 bg-[#0A0A0A] border border-luxury-gray-border/10 rounded" />
          </div>
        )}

        {fetchState === 'ERROR' && (
          <div className="p-10 bg-[#0A0A0A] border border-red-500/30 text-center space-y-4">
            <span className="font-sans text-[10px] tracking-[0.2em] text-red-400 uppercase font-bold block">
              COMMUNICATION NOTICE
            </span>
            <p className="font-serif text-lg text-luxury-white/80 font-light">
              {errorMessage || 'Unable to retrieve official scores at this moment.'}
            </p>
            <button
              type="button"
              onClick={() => fetchResults()}
              className="px-5 py-2 border border-luxury-gold/40 text-luxury-gold hover:bg-luxury-gold/10 font-sans text-xs tracking-widest uppercase transition-colors cursor-pointer"
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {fetchState === 'EMPTY' && (
          <div className="p-12 md:p-16 bg-[#0A0A0A] border border-luxury-gray-border/20 text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-luxury-gold/5 border border-luxury-gold/20 flex items-center justify-center mx-auto">
              <span className="font-mono text-xl text-luxury-gold">§</span>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-sans text-[10px] tracking-widest uppercase font-bold inline-block">
                NO RESULTS AVAILABLE FOR THIS CATEGORY
              </span>
              <h3 className="font-serif text-xl md:text-2xl text-luxury-white font-light pt-2">
                Official Scores Under Administrative Tabulation
              </h3>
              <p className="font-sans text-xs text-luxury-white/50 max-w-md mx-auto leading-relaxed">
                {resultsData?.message ||
                  'The official competition scores for this selection are currently undergoing administrative audit. Official standings will appear here once published.'}
              </p>
            </div>
          </div>
        )}

        {fetchState === 'SUCCESS' && isPublished && results.length > 0 && (
          <div className="space-y-12">
            {/* Winner Spotlight Card */}
            {winner && (
              <div className="border border-luxury-gold/40 bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] p-8 md:p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 font-serif text-[120px] font-bold text-luxury-gold/5 pointer-events-none select-none">
                  #1
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="px-3 py-1 bg-luxury-gold text-black font-sans text-[10px] tracking-widest uppercase font-bold inline-block">
                      OFFICIAL CATEGORY WINNER
                    </span>
                    <h2 className="font-mono text-3xl md:text-4xl font-bold text-luxury-white pt-1">
                      {winner.contestantId}
                    </h2>
                    <span className="font-sans text-xs text-luxury-gold uppercase tracking-luxury block">
                      {winner.category} ({winner.categoryCode})
                    </span>
                  </div>

                  <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-luxury-gold/20 pt-4 md:pt-0 md:pl-8 space-y-1">
                    <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
                      WINNING AGGREGATE SCORE
                    </span>
                    <div className="font-mono text-4xl font-bold text-luxury-gold">
                      {winner.finalScore.toFixed(1)}
                    </div>
                    <span className="font-mono text-xs text-luxury-white/40 block">
                      OUT OF {winner.maxMarks}.0 MAXIMUM MARKS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Results Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                  OFFICIAL LEADERBOARD RANKINGS
                </span>
                <span className="font-sans text-[10px] text-luxury-white/40 uppercase">
                  {results.length} CERTIFIED ENTRANTS
                </span>
              </div>

              <div className="bg-[#0A0A0A] border border-luxury-gray-border/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs">
                    <thead>
                      <tr className="border-b border-luxury-gray-border/20 text-luxury-white/40 uppercase tracking-luxury text-[9px]">
                        <th className="py-3 px-4 pl-6">Rank</th>
                        <th className="py-3 px-4">Contestant ID</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Admin Score (/30)</th>
                        <th className="py-3 px-4">Jury Score</th>
                        <th className="py-3 px-4 pr-6 text-right">Final Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-gray-border/10 text-luxury-white">
                      {results.map((item) => (
                        <tr
                          key={item.contestantId}
                          className={`hover:bg-luxury-gold/[0.03] transition-colors ${
                            item.rank === 1 ? 'bg-luxury-gold/[0.04]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 pl-6 font-serif text-luxury-gold font-bold text-sm">
                            #{item.rank}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-luxury-white">
                            {item.contestantId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-luxury-gold/90 uppercase block">
                              {item.category}
                            </span>
                            <span className="text-[10px] text-luxury-white/40">{item.categoryCode}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-luxury-white/80">
                            {item.adminTotal !== undefined ? item.adminTotal.toFixed(1) : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-luxury-white/80">
                            {item.judgeTotal !== undefined ? item.judgeTotal.toFixed(1) : '—'}
                          </td>
                          <td className="py-3.5 px-4 pr-6 text-right font-mono">
                            <span className="text-luxury-gold font-bold text-sm">
                              {item.finalScore.toFixed(1)}
                            </span>
                            <span className="text-luxury-white/40 text-[11px]"> / {item.maxMarks}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function PublicResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-luxury-white flex items-center justify-center">
          <div className="animate-pulse text-luxury-gold font-sans text-xs tracking-widest uppercase">
            Loading Official Standings...
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
