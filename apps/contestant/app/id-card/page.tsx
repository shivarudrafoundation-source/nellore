'use client';

import React, { useState, useEffect } from 'react';
import { ContestantAuthGuard } from '../components/contestant-auth-guard';
import { ContestantShell } from '../components/contestant-shell';
import { Card, Button, ContestantIdCard, getApiBaseUrl } from '@srf/ui';

function IdCardContent() {
  const API = getApiBaseUrl();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/contestant/profile`, { credentials: 'include' });
        if (!res.ok) throw new Error('Unable to load contestant ID profile.');
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load ID card.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-luxury-gray-border/10 rounded" />
        <div className="h-96 bg-luxury-gray-border/10 rounded" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 text-red-400 font-sans text-xs max-w-xl mx-auto">
        {error || 'Contestant profile could not be loaded.'}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto text-center">
      {/* Page Title */}
      <div className="space-y-2 print:hidden">
        <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
          OFFICIAL CONTESTANT ACCREDITATION
        </span>
        <h2 className="font-serif text-2xl md:text-3xl font-light text-luxury-white">
          Digital Entry Pass & ID Card
        </h2>
        <p className="font-sans text-xs text-luxury-white/50 max-w-md mx-auto">
          Present this official ID card at event registration desks, staging gates, and judge scoring tables.
        </p>
      </div>

      {/* Official ID Card Component */}
      <div className="flex justify-center py-2">
        <ContestantIdCard
          contestantId={profile.id}
          name={profile.name || 'Contestant'}
          categoryName={profile.category}
          categoryCode={profile.categoryCode}
          eventName={profile.event || profile.eventDetails?.name}
          eventCode={profile.eventCode || profile.eventDetails?.code}
          eventLogoUrl={profile.eventDetails?.logoUrl}
          location={profile.location || profile.eventDetails?.location}
          startDate={profile.eventDetails?.startDate}
          endDate={profile.eventDetails?.endDate}
          photoUrl={profile.photoUrl}
          gender={profile.gender}
          age={profile.age}
          paymentStatus="PAID"
          showPrintButton={true}
        />
      </div>
    </div>
  );
}

export default function IdCardPage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <IdCardContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
