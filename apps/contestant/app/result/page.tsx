'use client';

import React, { useState, useEffect } from 'react';
import { ContestantAuthGuard } from '../components/contestant-auth-guard';
import { ContestantShell } from '../components/contestant-shell';
import { Card } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function ResultContent() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadResult() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/contestant/result`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load result.');
        const data = await res.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-luxury-gray-border/10 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 text-red-400 font-sans text-xs">
        {error}
      </div>
    );
  }

  const isPublished = result?.isPublished;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-1">
        <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
          OFFICIAL EVENT RESULT
        </span>
        <h2 className="font-serif text-3xl font-light text-luxury-white">
          Nellore Nirajan Pageant
        </h2>
      </div>

      {!isPublished ? (
        /* Result Unpublished / Pending State */
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-8 md:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-luxury-gold/5 border border-luxury-gold/20 flex items-center justify-center mx-auto">
            <span className="font-mono text-2xl text-luxury-gold">⏳</span>
          </div>

          <div className="space-y-2">
            <span className="font-sans text-xs tracking-widest text-yellow-400 border border-yellow-500/30 px-3 py-1 bg-yellow-500/5 uppercase font-bold inline-block">
              RESULT PENDING
            </span>
            <h3 className="font-mono text-xl font-bold text-luxury-white pt-2">
              {result?.contestantId}
            </h3>
            <span className="font-sans text-xs text-luxury-white/50 block uppercase">
              Category: {result?.category}
            </span>
          </div>

          <p className="font-sans text-xs text-luxury-white/60 max-w-md mx-auto leading-relaxed">
            {result?.message ||
              'Official results for this category are undergoing final administrative verification and will be published upon conclusion of the event.'}
          </p>
        </Card>
      ) : (
        /* Result Published State */
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/40 p-8 md:p-12 text-center space-y-8 shadow-2xl">
          <div className="space-y-2">
            <span className="font-sans text-xs tracking-widest text-green-400 border border-green-500/30 px-3 py-1 bg-green-500/5 uppercase font-bold inline-block">
              RESULT PUBLISHED
            </span>
            <h3 className="font-mono text-2xl font-bold text-luxury-white pt-2">
              {result?.contestantId}
            </h3>
            <span className="font-sans text-xs text-luxury-gold uppercase font-bold block">
              Category: {result?.category} ({result?.categoryCode})
            </span>
          </div>

          {/* Score & Rank Showcase */}
          <div className="p-8 bg-[#050505] border border-luxury-gold/20 space-y-4">
            <span className="font-sans text-[10px] tracking-luxury text-luxury-white/40 uppercase block">
              AUTHORITATIVE FINAL SCORE
            </span>
            <div className="font-mono text-5xl font-bold text-luxury-gold">
              {result?.finalScore !== null ? Number(result.finalScore).toFixed(1) : '—'}
            </div>
            <span className="font-mono text-xs text-luxury-white/40 block">
              OUT OF {result?.maxMarks}.0 MAXIMUM MARKS
            </span>

            {result?.rank && (
              <div className="pt-4 border-t border-luxury-gray-border/10">
                <span className="font-serif text-lg text-luxury-white font-light">
                  Official Rank: <span className="font-bold text-luxury-gold">#{result.rank}</span>
                </span>
              </div>
            )}
          </div>

          {/* Breakdown summary */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-[#050505] border border-luxury-gray-border/10">
              <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
                ADMIN PRE-SCORE
              </span>
              <span className="font-mono text-sm font-bold text-luxury-white block mt-1">
                {result?.adminTotal !== null ? `${Number(result.adminTotal).toFixed(1)} / 30.0` : '—'}
              </span>
            </div>

            <div className="p-4 bg-[#050505] border border-luxury-gray-border/10">
              <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
                JURY STAGE SCORE
              </span>
              <span className="font-mono text-sm font-bold text-luxury-white block mt-1">
                {result?.judgeTotal !== null ? Number(result.judgeTotal).toFixed(1) : '—'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function ContestantResultPage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <ResultContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
