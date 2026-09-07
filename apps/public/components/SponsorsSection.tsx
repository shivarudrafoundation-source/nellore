'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getApiBaseUrl } from '@srf/ui';

export interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logoUrl: string;
  websiteUrl: string | null;
  description: string | null;
  order: number;
  isActive: boolean;
}

const TIER_META: Record<
  string,
  { label: string; badge: string; borderClass: string; glowClass: string }
> = {
  TITLE: {
    label: 'TITLE SPONSOR',
    badge: '👑 OFFICIAL TITLE SPONSOR',
    borderClass: 'border-luxury-gold/50 hover:border-luxury-gold',
    glowClass: 'shadow-[0_0_50px_rgba(212,175,55,0.22)]',
  },
  POWERED_BY: {
    label: 'POWERED BY',
    badge: '★ POWERED BY ★',
    borderClass: 'border-luxury-gold/40 hover:border-luxury-gold',
    glowClass: 'shadow-[0_0_40px_rgba(212,175,55,0.18)]',
  },
  ASSOCIATE: {
    label: 'ASSOCIATE SPONSOR',
    badge: '✦ ASSOCIATE SPONSOR ✦',
    borderClass: 'border-purple-400/30 hover:border-purple-400/60',
    glowClass: 'shadow-[0_0_30px_rgba(168,85,247,0.12)]',
  },
  PLATINUM: {
    label: 'PLATINUM PARTNER',
    badge: '◆ PLATINUM PARTNER ◆',
    borderClass: 'border-cyan-400/30 hover:border-cyan-400/60',
    glowClass: 'shadow-[0_0_30px_rgba(34,211,238,0.12)]',
  },
  GOLD: {
    label: 'GOLD PARTNER',
    badge: '★ GOLD PARTNER ★',
    borderClass: 'border-yellow-400/30 hover:border-yellow-400/60',
    glowClass: 'shadow-[0_0_25px_rgba(250,204,21,0.1)]',
  },
  SILVER: {
    label: 'SILVER PARTNER',
    badge: 'SILVER PARTNER',
    borderClass: 'border-slate-400/30 hover:border-slate-400/60',
    glowClass: 'shadow-[0_0_20px_rgba(148,163,184,0.1)]',
  },
  OFFICIAL_PARTNER: {
    label: 'OFFICIAL PARTNER',
    badge: 'OFFICIAL BRAND PARTNER',
    borderClass: 'border-luxury-gold/30 hover:border-luxury-gold/60',
    glowClass: 'shadow-[0_0_25px_rgba(212,175,55,0.12)]',
  },
};

/**
 * Grand Spotlight Card for Premier Tiers (TITLE & POWERED_BY)
 */
function GrandSpotlightCard({ sponsor }: { sponsor: Sponsor }) {
  const [imageError, setImageError] = useState(false);
  const meta = TIER_META[sponsor.tier] || TIER_META.TITLE;

  return (
    <div
      className={`relative group bg-gradient-to-b from-[#141414] via-[#0D0D0D] to-[#050505] border ${meta.borderClass} ${meta.glowClass} p-8 sm:p-10 rounded-sm transition-all duration-500 max-w-2xl w-full mx-auto overflow-hidden text-center`}
    >
      {/* Decorative Luxury Corner Brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-luxury-gold/70 pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-luxury-gold/70 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-luxury-gold/70 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-luxury-gold/70 pointer-events-none" />

      {/* Radiant Golden Ambient Glow behind logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-luxury-gold/10 rounded-full filter blur-3xl pointer-events-none group-hover:bg-luxury-gold/20 transition-all duration-700" />

      {/* Top Tier Badge */}
      <div className="relative z-10 mb-6 inline-flex items-center justify-center">
        <span className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.28em] px-4 py-1.5 border border-luxury-gold/50 bg-luxury-gold/15 text-luxury-gold uppercase rounded-xs shadow-sm">
          {meta.badge}
        </span>
      </div>

      {/* Logo Pedestal Frame with contrast plate for transparent/dark logos */}
      <div className="relative z-10 my-4 flex items-center justify-center">
        <div className="relative w-full max-w-md h-40 sm:h-48 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-md border border-luxury-gold/30 rounded-sm p-6 flex items-center justify-center group-hover:border-luxury-gold group-hover:bg-white/[0.12] transition-all duration-500 shadow-2xl">
          {sponsor.logoUrl && !imageError ? (
            <div className="relative w-full h-full">
              <Image
                src={sponsor.logoUrl}
                alt={sponsor.name}
                fill
                className="object-contain transition-transform duration-500 group-hover:scale-105 filter drop-shadow-md"
                unoptimized={
                  sponsor.logoUrl.startsWith('data:') || sponsor.logoUrl.startsWith('http')
                }
                onError={() => setImageError(true)}
                priority
              />
            </div>
          ) : (
            <div className="text-center space-y-1">
              <span className="font-serif text-3xl font-light text-luxury-gold tracking-widest block">
                {sponsor.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sponsor Details */}
      <div className="relative z-10 space-y-3 mt-6">
        <h3 className="font-serif text-2xl sm:text-3xl font-light text-luxury-white uppercase tracking-wider group-hover:text-luxury-gold transition-colors duration-300">
          {sponsor.name}
        </h3>

        {sponsor.description && (
          <p className="font-sans text-xs sm:text-sm text-[#B8B8B8] max-w-lg mx-auto leading-relaxed">
            {sponsor.description}
          </p>
        )}

        {/* Website Action Button */}
        {sponsor.websiteUrl && (
          <div className="pt-4">
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3 border border-luxury-gold bg-luxury-gold text-luxury-black-pure hover:bg-transparent hover:text-luxury-gold font-sans text-xs font-semibold tracking-luxury uppercase transition-all duration-300 rounded-xs shadow-lg"
            >
              <span>VISIT OFFICIAL PORTAL</span>
              <span className="font-mono text-sm">↗</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Standard Luxury Partner Card
 */
function PartnerCard({ sponsor }: { sponsor: Sponsor }) {
  const [imageError, setImageError] = useState(false);
  const meta = TIER_META[sponsor.tier] || TIER_META.OFFICIAL_PARTNER;

  const card = (
    <div
      className={`group relative bg-[#0A0A0A] border ${meta.borderClass} hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] p-5 rounded-sm transition-all duration-300 flex flex-col justify-between h-full overflow-hidden text-center`}
    >
      {/* Corner subtle tick */}
      <div className="absolute top-1.5 right-1.5 text-[8px] text-luxury-gold/40 font-mono">✦</div>

      {/* Tier Header */}
      <div className="mb-3">
        <span className="text-[9px] font-sans font-semibold tracking-[0.2em] text-luxury-gold uppercase block">
          {meta.label}
        </span>
      </div>

      {/* Logo container with contrast backdrop */}
      <div className="relative w-full h-28 sm:h-32 bg-white/[0.05] border border-white/10 group-hover:border-luxury-gold/40 rounded-xs p-4 flex items-center justify-center transition-all duration-300 mb-3">
        {sponsor.logoUrl && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={sponsor.logoUrl}
              alt={sponsor.name}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-105 filter drop-shadow-sm"
              unoptimized={
                sponsor.logoUrl.startsWith('data:') || sponsor.logoUrl.startsWith('http')
              }
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <span className="font-serif text-lg font-light text-luxury-gold tracking-wide">
            {sponsor.name}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1">
        <h4 className="font-serif text-base font-light text-luxury-white uppercase tracking-wider group-hover:text-luxury-gold transition-colors duration-300 truncate">
          {sponsor.name}
        </h4>
        {sponsor.description && (
          <p className="font-sans text-[11px] text-[#B8B8B8]/70 line-clamp-2 leading-relaxed">
            {sponsor.description}
          </p>
        )}
      </div>

      {/* Link indicator */}
      {sponsor.websiteUrl && (
        <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-center gap-1 text-[10px] font-sans text-luxury-gold group-hover:underline">
          <span>Official Website</span>
          <span className="font-mono">↗</span>
        </div>
      )}
    </div>
  );

  if (sponsor.websiteUrl) {
    return (
      <a
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Visit ${sponsor.name}`}
        className="block h-full focus:outline-none"
      >
        {card}
      </a>
    );
  }

  return <div className="h-full">{card}</div>;
}

export default function SponsorsSection() {
  const API = getApiBaseUrl();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    async function loadSponsors() {
      try {
        const res = await fetch(`${API}/public/sponsors`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSponsors(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        // Handle gracefully
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    loadSponsors();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [API]);

  // Group sponsors
  const premierSponsors = sponsors.filter(
    (s) => s.tier === 'TITLE' || s.tier === 'POWERED_BY',
  );
  const otherSponsors = sponsors.filter(
    (s) => s.tier !== 'TITLE' && s.tier !== 'POWERED_BY',
  );

  return (
    <section
      id="sponsors"
      className="py-24 sm:py-32 bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 px-6 sm:px-[48px] md:px-[64px] relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[70vw] h-[400px] bg-luxury-gold/5 filter blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 text-luxury-gold">
            <span className="h-[1px] w-8 bg-luxury-gold/60" />
            <span className="font-sans text-[10px] tracking-[0.35em] uppercase font-bold">
              PATRONS & ALLIANCES
            </span>
            <span className="h-[1px] w-8 bg-luxury-gold/60" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light uppercase tracking-wide text-luxury-white">
            HONOURED SPONSORS & PARTNERS
          </h2>

          {/* Golden Ornamental Divider */}
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-luxury-gold/60" />
            <span className="text-luxury-gold text-xs">◆</span>
            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-luxury-gold/60" />
          </div>

          <p className="font-sans text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
            Distinguished institutions and elite brands powering talent, heritage, and distinction across Shiva Rudra Foundations pageants.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-luxury-gold font-mono text-xs tracking-widest animate-pulse">
            LOADING BRAND PARTNERS...
          </div>
        ) : sponsors.length > 0 ? (
          <div className="space-y-16">
            {/* Premier Spotlight (Title & Powered By) */}
            {premierSponsors.length > 0 && (
              <div className="space-y-8">
                {premierSponsors.length === 1 ? (
                  <div className="flex justify-center">
                    <GrandSpotlightCard sponsor={premierSponsors[0]} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {premierSponsors.map((sponsor) => (
                      <GrandSpotlightCard key={sponsor.id} sponsor={sponsor} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Other Sponsor Tiers (Associate, Platinum, Gold, Silver, Partners) */}
            {otherSponsors.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-white/10">
                <div className="text-center">
                  <span className="font-sans text-[10px] tracking-[0.3em] text-white/50 uppercase font-semibold">
                    ASSOCIATE & OFFICIAL BRAND PARTNERS
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {otherSponsors.map((sponsor) => (
                    <PartnerCard key={sponsor.id} sponsor={sponsor} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Sponsor with Us CTA Banner */}
        <div className="relative bg-gradient-to-r from-luxury-black via-[#0F0F0F] to-luxury-black border border-luxury-gold/40 p-8 sm:p-14 text-center rounded-sm space-y-6 max-w-4xl mx-auto overflow-hidden shadow-2xl">
          {/* Subtle gold corner accent */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-luxury-gold/80" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-luxury-gold/80" />

          <span className="font-sans text-[10px] tracking-[0.32em] text-luxury-gold uppercase font-bold block">
            STRATEGIC BRAND COLLABORATION
          </span>

          <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-light text-luxury-white uppercase tracking-wide">
            ELEVATE YOUR BRAND ON OUR STAGE
          </h3>

          <p className="font-sans text-xs sm:text-sm text-[#B8B8B8] max-w-lg mx-auto leading-relaxed">
            Gain premier exposure, VIP audience branding, and widespread digital coverage across Nellore Nerajana & Shiva Rudra Foundations events.
          </p>

          <div className="pt-2">
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center h-12 px-10 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300 shadow-lg"
            >
              PARTNER WITH US ↗
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
