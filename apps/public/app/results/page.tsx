'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

export default function PublicResultsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventSlug, setSelectedEventSlug] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [resultsData, setResultsData] = useState<{
    status: string;
    isPublished: boolean;
    message?: string;
    event?: any;
    results: PublicResultItem[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // 1. Fetch available public events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/public/events`);
        if (res.ok) {
          const data = await res.json();
          const evList = data.events || data || [];
          setEvents(evList);
          if (evList.length > 0 && !selectedEventSlug) {
            setSelectedEventSlug(evList[0].code || evList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load public events:', err);
      }
    }
    loadEvents();
  }, []);

  // 2. Fetch categories for selected event
  useEffect(() => {
    if (!selectedEventSlug) return;
    async function loadCategories() {
      try {
        const res = await fetch(`${API}/public/events/${selectedEventSlug}/categories`);
        if (res.ok) {
          const cats = await res.json();
          setCategories(cats || []);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, [selectedEventSlug]);

  // 3. Fetch results for event & category
  const fetchResults = useCallback(async () => {
    if (!selectedEventSlug) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('categoryId', selectedCategory);

      const res = await fetch(`${API}/public/events/${selectedEventSlug}/results?${params}`);
      if (!res.ok) {
        throw new Error('Official results are currently unavailable.');
      }
      const data = await res.json();
      setResultsData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load official results.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventSlug, selectedCategory]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

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
        <div className="p-6 bg-[#0A0A0A] border border-luxury-gray-border/20 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Event Selector */}
          <div className="flex-1">
            <label className="block font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury mb-1">
              Select Competition Event
            </label>
            <select
              value={selectedEventSlug}
              onChange={(e) => {
                setSelectedEventSlug(e.target.value);
                setSelectedCategory('');
              }}
              className="w-full h-10 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white uppercase tracking-luxury outline-none focus:border-luxury-gold/50"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.code || ev.id}>
                  {ev.name} ({ev.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter Pills */}
          <div className="space-y-1">
            <label className="block font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury">
              Filter by Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 font-sans text-[10px] tracking-luxury uppercase border transition-all duration-200 ${
                  selectedCategory === ''
                    ? 'border-luxury-gold bg-luxury-gold/10 text-luxury-gold font-bold'
                    : 'border-luxury-gray-border/20 text-luxury-white/60 hover:text-white'
                }`}
              >
                ALL
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 font-sans text-[10px] tracking-luxury uppercase border transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? 'border-luxury-gold bg-luxury-gold/10 text-luxury-gold font-bold'
                      : 'border-luxury-gray-border/20 text-luxury-white/60 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content: Loading / Pending / Published */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 bg-[#0A0A0A] border border-luxury-gray-border/10 rounded" />
            <div className="h-64 bg-[#0A0A0A] border border-luxury-gray-border/10 rounded" />
          </div>
        ) : error ? (
          <div className="p-8 bg-red-950/20 border border-red-500/30 text-center space-y-2">
            <span className="font-sans text-xs text-red-400 block">{error}</span>
          </div>
        ) : !isPublished ? (
          /* Unpublished / Pending State Card */
          <div className="p-12 md:p-16 bg-[#0A0A0A] border border-luxury-gray-border/20 text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-luxury-gold/5 border border-luxury-gold/20 flex items-center justify-center mx-auto">
              <span className="font-mono text-xl text-luxury-gold">§</span>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-sans text-[10px] tracking-widest uppercase font-bold inline-block">
                RESULTS NOT YET PUBLISHED
              </span>
              <h3 className="font-serif text-xl md:text-2xl text-luxury-white font-light pt-2">
                Official Scores Under Administrative Review
              </h3>
              <p className="font-sans text-xs text-luxury-white/50 max-w-md mx-auto leading-relaxed">
                {resultsData?.message ||
                  'The official competition scores for this selection are currently undergoing final administrative tabulation. Official results will be published here upon completion.'}
              </p>
            </div>
          </div>
        ) : (
          /* Published Results Section */
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
