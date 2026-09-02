'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContestantAuthGuard } from './components/contestant-auth-guard';
import { ContestantShell } from './components/contestant-shell';
import { Card, Button, getApiBaseUrl } from '@srf/ui';

function DashboardContent() {
  const API = getApiBaseUrl();
  const [overview, setOverview] = useState<any>(null);
  const [scores, setScores] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [meRes, scoresRes] = await Promise.all([
          fetch(`${API}/contestant/me`, { credentials: 'include' }),
          fetch(`${API}/contestant/scores`, { credentials: 'include' }),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setOverview(meData);
        }

        if (scoresRes.ok) {
          const scoresData = await scoresRes.json();
          setScores(scoresData);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load contestant dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-luxury-gray-border/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-luxury-gray-border/10 rounded" />
          <div className="h-28 bg-luxury-gray-border/10 rounded" />
          <div className="h-28 bg-luxury-gray-border/10 rounded" />
        </div>
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

  const isKids = scores?.isKids;
  const adminTotal = scores?.adminScore?.total;
  const judgeTotal = scores?.judgeTotal;
  const maxMarks = scores?.maxMarks || (isKids ? 230 : 430);
  const totalCalculated =
    adminTotal !== null || judgeTotal > 0
      ? Math.round(((adminTotal || 0) + (judgeTotal || 0)) * 100) / 100
      : null;

  return (
    <div className="space-y-8">
      {/* 1. Contestant Overview Banner */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
              OFFICIAL CONTESTANT DOSSIER
            </span>
            <h2 className="font-mono text-2xl md:text-3xl font-bold text-luxury-white">
              {overview?.id}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="px-3 py-1 bg-luxury-gold/10 border border-luxury-gold/30 font-sans text-xs text-luxury-gold font-bold uppercase">
                {overview?.category?.name || 'Category'} ({overview?.category?.code})
              </span>
              <span className="text-luxury-white/50 text-xs font-sans">
                {overview?.event?.name || 'Nellore Nirajan Pageant'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="text-left md:text-right">
              <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
                PARTICIPATION STATUS
              </span>
              <span className="font-sans text-xs font-bold text-green-400 border border-green-500/30 px-3 py-1 bg-green-500/5 mt-1 uppercase inline-block">
                {overview?.status || 'ACTIVE'}
              </span>
            </div>

            <Link href="/id-card">
              <Button size="sm" className="bg-luxury-gold hover:bg-[#E5C158] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <span>🎫</span>
                <span>VIEW OFFICIAL ID CARD ↗</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. Score Summary Cards */}
      <div className="space-y-3">
        <span className="font-sans text-[10px] tracking-luxury text-luxury-white/40 uppercase font-bold block">
          PERFORMANCE SCORE SUMMARY
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin Score Card */}
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-2">
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              ADMIN PRE-SCORE
            </span>
            <div className="font-mono text-2xl font-bold text-luxury-white">
              {adminTotal !== null ? adminTotal.toFixed(1) : '—'}
              <span className="text-xs text-luxury-white/40 font-normal"> / 30.0 PTS</span>
            </div>
            <span className="font-sans text-[10px] text-luxury-gold block">
              Discipline: {scores?.adminScore?.discipline ?? '—'} • Talent: {scores?.adminScore?.talent ?? '—'}
            </span>
          </Card>

          {/* Judge Score Card */}
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-2">
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              JUDGES EVALUATION TOTAL
            </span>
            <div className="font-mono text-2xl font-bold text-luxury-white">
              {judgeTotal !== undefined ? judgeTotal.toFixed(1) : '—'}
              <span className="text-xs text-luxury-white/40 font-normal"> / {scores?.judgeMax || (isKids ? 200 : 400)} PTS</span>
            </div>
            <span className="font-sans text-[10px] text-luxury-white/50 block">
              {scores?.judgeScores?.length || 0} rounds submitted
            </span>
          </Card>

          {/* Aggregate Performance Score Card */}
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/30 p-6 space-y-2">
            <span className="font-sans text-[9px] text-luxury-gold uppercase tracking-luxury font-bold block">
              AGGREGATED EVALUATION
            </span>
            <div className="font-mono text-2xl font-bold text-luxury-gold">
              {totalCalculated !== null ? totalCalculated.toFixed(1) : 'PENDING'}
              <span className="text-xs text-luxury-white/40 font-normal"> / {maxMarks} PTS</span>
            </div>
            <span className="font-sans text-[10px] text-luxury-white/50 block">
              {isKids ? 'Kids (Max 230)' : 'Pageant (Max 430)'}
            </span>
          </Card>
        </div>
      </div>

      {/* 3. Quick Action Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <Link href="/profile">
          <Card hoverEffect={true} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-5 space-y-1 hover:border-luxury-gold/50 transition-colors">
            <span className="font-mono text-xs text-luxury-gold block">01 /</span>
            <span className="font-sans text-xs uppercase tracking-luxury text-luxury-white font-bold block">
              MY PROFILE
            </span>
            <span className="font-sans text-[10px] text-luxury-white/40 block">
              View registered details & custom fields
            </span>
          </Card>
        </Link>

        <Link href="/scores">
          <Card hoverEffect={true} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-5 space-y-1 hover:border-luxury-gold/50 transition-colors">
            <span className="font-mono text-xs text-luxury-gold block">02 /</span>
            <span className="font-sans text-xs uppercase tracking-luxury text-luxury-white font-bold block">
              MY SCORES
            </span>
            <span className="font-sans text-[10px] text-luxury-white/40 block">
              Round evaluations & marks breakdown
            </span>
          </Card>
        </Link>

        <Link href="/result">
          <Card hoverEffect={true} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-5 space-y-1 hover:border-luxury-gold/50 transition-colors">
            <span className="font-mono text-xs text-luxury-gold block">03 /</span>
            <span className="font-sans text-xs uppercase tracking-luxury text-luxury-white font-bold block">
              FINAL RESULT
            </span>
            <span className="font-sans text-[10px] text-luxury-white/40 block">
              Official published standing
            </span>
          </Card>
        </Link>

        <Link href="/documents">
          <Card hoverEffect={true} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-5 space-y-1 hover:border-luxury-gold/50 transition-colors">
            <span className="font-mono text-xs text-luxury-gold block">04 /</span>
            <span className="font-sans text-xs uppercase tracking-luxury text-luxury-white font-bold block">
              DOCUMENTS
            </span>
            <span className="font-sans text-[10px] text-luxury-white/40 block">
              Official rulebooks & guidelines
            </span>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default function ContestantDashboardPage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <DashboardContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
