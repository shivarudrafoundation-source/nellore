'use client';

import React, { useState, useEffect } from 'react';
import { ContestantAuthGuard } from '../components/contestant-auth-guard';
import { ContestantShell } from '../components/contestant-shell';
import { Card, getApiBaseUrl } from '@srf/ui';

function ScoresContent() {
  const API = getApiBaseUrl();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadScores() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/contestant/scores`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load scores.');
        const resData = await res.json();
        setData(resData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadScores();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-luxury-gray-border/10 rounded" />
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

  const isKids = data?.isKids;
  const maxMarks = data?.maxMarks || (isKids ? 230 : 430);
  const judgeMax = data?.judgeMax || (isKids ? 200 : 400);
  const adminTotal = data?.adminScore?.total;
  const judgeTotal = data?.judgeTotal || 0;
  const calculatedTotal =
    adminTotal !== null ? Math.round(((adminTotal || 0) + judgeTotal) * 100) / 100 : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
          My Evaluation Scores
        </h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          {isKids ? 'Kids Division (Max 230 Marks)' : 'Pageant Division (Max 430 Marks)'}
        </p>
      </div>

      {/* 1. Admin Pre-Score Matrix */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-luxury-gray-border/10">
          <div>
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
              SECTION 1 / ADMINISTRATIVE PRE-EVALUATION
            </span>
            <span className="font-sans text-xs text-luxury-white/50">
              Assessed on discipline, decorum & talent presentation
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-luxury-gold">
              {adminTotal !== null ? adminTotal.toFixed(1) : '—'}
            </span>
            <span className="font-mono text-xs text-luxury-white/40"> / 30.0 PTS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#050505] border border-luxury-gray-border/10 flex justify-between items-center">
            <div>
              <span className="font-sans text-xs text-luxury-white block font-medium">Discipline Round</span>
              <span className="font-sans text-[10px] text-luxury-white/40 block">Decorum, punctuality & etiquette</span>
            </div>
            <span className="font-mono text-sm font-bold text-luxury-white">
              {data?.adminScore?.discipline !== null ? `${Number(data?.adminScore?.discipline).toFixed(1)} / 10.0` : '—'}
            </span>
          </div>

          <div className="p-4 bg-[#050505] border border-luxury-gray-border/10 flex justify-between items-center">
            <div>
              <span className="font-sans text-xs text-luxury-white block font-medium">Talent Round</span>
              <span className="font-sans text-[10px] text-luxury-white/40 block">Special talent performance</span>
            </div>
            <span className="font-mono text-sm font-bold text-luxury-white">
              {data?.adminScore?.talent !== null ? `${Number(data?.adminScore?.talent).toFixed(1)} / 20.0` : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Judge Evaluation Rounds */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-luxury-gray-border/10">
          <div>
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
              SECTION 2 / JURY STAGE EVALUATIONS
            </span>
            <span className="font-sans text-xs text-luxury-white/50">
              {isKids ? '4 Jury Evaluations (Max 200 PTS)' : '4 Jury Evaluations × 2 Rounds (Max 400 PTS)'}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-luxury-gold">
              {judgeTotal.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-luxury-white/40"> / {judgeMax}.0 PTS</span>
          </div>
        </div>

        {data?.judgeScores && data.judgeScores.length > 0 ? (
          <div className="space-y-3">
            {data.judgeScores.map((score: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-[#050505] border border-luxury-gray-border/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-sans text-xs text-luxury-white font-medium block">
                    {score.roundName}
                  </span>
                  <span className="font-sans text-[10px] text-luxury-white/40 block">
                    {score.evaluator}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-sans text-[9px] tracking-luxury uppercase px-2 py-0.5 border ${
                      score.status === 'LOCKED'
                        ? 'text-green-400 border-green-500/30 bg-green-500/5'
                        : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5'
                    }`}
                  >
                    {score.status}
                  </span>
                  <span className="font-mono text-sm font-bold text-luxury-gold">
                    {Number(score.scoreValue).toFixed(1)} / {score.roundMaxMarks} PTS
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#050505] border border-luxury-gray-border/10">
            <span className="font-sans text-xs text-luxury-white/30 uppercase tracking-luxury">
              NO JURY SCORES SUBMITTED YET
            </span>
          </div>
        )}
      </Card>

      {/* 3. Aggregate Total Card */}
      <Card hoverEffect={false} className="bg-black border border-luxury-gold/30 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="font-sans text-xs uppercase tracking-luxury text-luxury-white font-bold block">
            TOTAL EVALUATION MARKS ACCRUED
          </span>
          <span className="font-sans text-[10px] text-luxury-white/50 block mt-0.5">
            Admin Pre-Score ({adminTotal !== null ? adminTotal.toFixed(1) : 0}) + Jury Evaluations ({judgeTotal.toFixed(1)})
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-3xl font-bold text-luxury-gold">
            {calculatedTotal !== null ? calculatedTotal.toFixed(1) : '—'}
          </span>
          <span className="font-mono text-sm text-luxury-white/40"> / {maxMarks}.0 PTS</span>
        </div>
      </Card>
    </div>
  );
}

export default function ContestantScoresPage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <ScoresContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
