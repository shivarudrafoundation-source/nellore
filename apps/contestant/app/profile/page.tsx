'use client';

import React, { useState, useEffect } from 'react';
import { ContestantAuthGuard } from '../components/contestant-auth-guard';
import { ContestantShell } from '../components/contestant-shell';
import { Card, getApiBaseUrl } from '@srf/ui';

function ProfileContent() {
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
        if (!res.ok) throw new Error('Failed to load profile.');
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-luxury-gray-border/10 rounded" />
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
          Contestant Profile
        </h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Verified Official Registration Record
        </p>
      </div>

      {/* Primary Identity Card */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-luxury-gray-border/10 gap-4">
          <div>
            <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
              CONTESTANT IDENTIFIER
            </span>
            <span className="font-mono text-2xl font-bold text-luxury-white block mt-1">
              {profile?.id}
            </span>
          </div>
          <div className="px-3 py-1.5 bg-luxury-gold/10 border border-luxury-gold/30 self-start sm:self-auto">
            <span className="font-sans text-xs font-bold text-luxury-gold uppercase">
              {profile?.category} ({profile?.categoryCode})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              FULL LEGAL NAME
            </span>
            <span className="font-sans text-sm font-medium text-luxury-white block mt-1">
              {profile?.name || '—'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              REGISTERED MOBILE
            </span>
            <span className="font-mono text-sm text-luxury-white block mt-1">
              {profile?.mobile || '—'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              EMAIL ADDRESS
            </span>
            <span className="font-sans text-sm text-luxury-white/80 block mt-1">
              {profile?.email || '—'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              GENDER / PRONOUNS
            </span>
            <span className="font-sans text-sm text-luxury-white block mt-1">
              {profile?.gender || '—'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              DATE OF BIRTH
            </span>
            <span className="font-mono text-sm text-luxury-white block mt-1">
              {profile?.dob || '—'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              RECORDED AGE
            </span>
            <span className="font-mono text-sm text-luxury-white block mt-1">
              {profile?.age ? `${profile.age} Years` : '—'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              ORIGIN / LOCATION
            </span>
            <span className="font-sans text-sm text-luxury-white block mt-1">
              {profile?.location || 'Nellore'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              EVENT
            </span>
            <span className="font-sans text-sm text-luxury-gold block mt-1">
              {profile?.event || 'Nellore Nirajan Pageant'}
            </span>
          </div>

          <div>
            <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
              REGISTERED ON
            </span>
            <span className="font-mono text-sm text-luxury-white/50 block mt-1">
              {profile?.registeredAt ? new Date(profile.registeredAt).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* Custom Fields Card */}
      {profile?.customFields && Object.keys(profile.customFields).length > 0 && (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 md:p-8 space-y-4">
          <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
            ADDITIONAL PROFILE ATTRIBUTES
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries(profile.customFields).map(([key, val]) => (
              <div key={key}>
                <span className="font-sans text-[9px] text-luxury-white/40 uppercase tracking-luxury block">
                  {key}
                </span>
                <span className="font-sans text-sm font-medium text-luxury-white block mt-1">
                  {String(val) || '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Security Advisory */}
      <div className="p-4 bg-luxury-gold/[0.03] border border-luxury-gold/20 text-luxury-white/60 font-sans text-xs">
        ℹ For security reasons and to maintain competitive integrity, identity details and category assignments can only be updated by the Administrative Secretariat.
      </div>
    </div>
  );
}

export default function ContestantProfilePage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <ProfileContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
