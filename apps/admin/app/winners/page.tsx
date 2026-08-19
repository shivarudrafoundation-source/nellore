'use client';

import React from 'react';
import Link from 'next/link';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Card, Button } from '@srf/ui';

function WinnersContent() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Winners & Results Board</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Category rankings, final podium placements & public result publishing
          </p>
        </div>
      </div>

      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-12 text-center space-y-4">
        <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
          RESULTS CURATION & PUBLISHING
        </span>
        <h3 className="font-serif text-xl font-light text-luxury-white">
          No Final Results Published Yet
        </h3>
        <p className="font-sans text-xs text-luxury-white/40 max-w-md mx-auto leading-relaxed">
          Winners will automatically be calculated and ready for official verification and publishing once judges submit and lock scores for all rounds.
        </p>
        <div className="pt-2">
          <Link href="/scoring">
            <Button size="sm" variant="outline">
              VIEW LIVE SCORING STATUS ↗
            </Button>
          </Link>
        </div>
      </Card>
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
