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

const TIER_ORDER: Record<string, number> = {
  TITLE: 1,
  POWERED_BY: 2,
  ASSOCIATE: 3,
  PLATINUM: 4,
  GOLD: 5,
  SILVER: 6,
  OFFICIAL_PARTNER: 7,
};

function SponsorLogoCard({
  sponsor,
  size = 'md',
}: {
  sponsor: Sponsor;
  size?: 'lg' | 'md' | 'sm';
}) {
  const [imageError, setImageError] = useState(false);

  const containerHeight =
    size === 'lg' ? 'h-32 sm:h-40' : size === 'md' ? 'h-24 sm:h-28' : 'h-20';

  const cardContent = (
    <div
      className={`group relative bg-[#0A0A0A] border border-luxury-gold/20 hover:border-luxury-gold/60 p-5 flex flex-col items-center justify-center transition-all duration-300 rounded-sm overflow-hidden ${containerHeight} hover:shadow-[0_0_25px_rgba(212,175,55,0.12)]`}
    >
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-tr from-luxury-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {sponsor.logoUrl && !imageError ? (
        <div className="relative w-full h-full max-w-[85%] max-h-[85%]">
          <Image
            src={sponsor.logoUrl}
            alt={sponsor.name}
            fill
            className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
            unoptimized={sponsor.logoUrl.startsWith('data:') || sponsor.logoUrl.startsWith('http')}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="text-center space-y-1">
          <span className="font-serif text-lg md:text-xl font-light text-luxury-gold tracking-wider block">
            {sponsor.name}
          </span>
          {sponsor.description && (
            <span className="text-[9px] font-sans text-white/50 tracking-widest uppercase block">
              {sponsor.description}
            </span>
          )}
        </div>
      )}

      {/* Subtle external link indicator on hover */}
      {sponsor.websiteUrl && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-luxury-gold text-xs font-mono">
          ↗
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
        className="block focus:outline-none"
      >
        {cardContent}
      </a>
    );
  }

  return <div>{cardContent}</div>;
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
        // Fail silently and render graceful state
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

  // Group sponsors by tier
  const titleSponsors = sponsors.filter((s) => s.tier === 'TITLE');
  const poweredBySponsors = sponsors.filter((s) => s.tier === 'POWERED_BY');
  const associateSponsors = sponsors.filter((s) => s.tier === 'ASSOCIATE');
  const platinumSponsors = sponsors.filter((s) => s.tier === 'PLATINUM');
  const goldSponsors = sponsors.filter((s) => s.tier === 'GOLD');
  const silverSponsors = sponsors.filter((s) => s.tier === 'SILVER');
  const officialPartners = sponsors.filter(
    (s) => s.tier === 'OFFICIAL_PARTNER' || !TIER_ORDER[s.tier],
  );

  return (
    <section
      id="sponsors"
      className="py-20 sm:py-28 bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 px-6 sm:px-[48px] md:px-[64px] relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[60vw] h-[300px] bg-luxury-gold/5 filter blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="font-sans text-[10px] tracking-[0.3em] text-luxury-gold uppercase font-bold block">
            PATRONS & ALLIANCES
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light uppercase tracking-wide text-luxury-white">
            OUR SPONSORS & PARTNERS
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#B8B8B8] leading-relaxed pt-1">
            Empowering pageantry excellence and celebrating heritage through elite brand collaborations.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-luxury-gold font-mono text-xs tracking-widest animate-pulse">
            LOADING BRAND PARTNERS...
          </div>
        ) : sponsors.length > 0 ? (
          <div className="space-y-14">
            {/* Title & Presenting Sponsors */}
            {(titleSponsors.length > 0 || poweredBySponsors.length > 0) && (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="font-sans text-[10px] tracking-[0.25em] text-luxury-gold uppercase font-semibold">
                    TITLE & POWERED BY
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {titleSponsors.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="lg" />
                  ))}
                  {poweredBySponsors.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="lg" />
                  ))}
                </div>
              </div>
            )}

            {/* Associate & Platinum Sponsors */}
            {(associateSponsors.length > 0 || platinumSponsors.length > 0) && (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="font-sans text-[10px] tracking-[0.25em] text-white/50 uppercase font-medium">
                    ASSOCIATE & PLATINUM ALLIANCES
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                  {associateSponsors.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="md" />
                  ))}
                  {platinumSponsors.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="md" />
                  ))}
                </div>
              </div>
            )}

            {/* Gold, Silver & Official Brand Partners */}
            {(goldSponsors.length > 0 ||
              silverSponsors.length > 0 ||
              officialPartners.length > 0) && (
              <div className="space-y-6">
                <div className="text-center">
                  <span className="font-sans text-[10px] tracking-[0.25em] text-white/40 uppercase font-medium">
                    OFFICIAL BRAND & MEDIA PARTNERS
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {goldSponsors.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="sm" />
                  ))}
                  {silverSponsors.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="sm" />
                  ))}
                  {officialPartners.map((s) => (
                    <SponsorLogoCard key={s.id} sponsor={s} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Sponsor with Us CTA Banner */}
        <div className="bg-gradient-to-r from-luxury-black via-[#0E0E0E] to-luxury-black border border-luxury-gold/30 p-8 sm:p-12 text-center rounded-sm space-y-5 max-w-4xl mx-auto">
          <span className="font-sans text-[10px] tracking-[0.3em] text-luxury-gold uppercase font-bold block">
            STRATEGIC PARTNERSHIP OPPORTUNITIES
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl font-light text-luxury-white uppercase tracking-wide">
            BECOME AN OFFICIAL SPONSOR
          </h3>
          <p className="font-sans text-xs sm:text-sm text-[#B8B8B8] max-w-lg mx-auto leading-relaxed">
            Gain premier brand exposure, VIP stage branding, and high-impact digital reach across Nellore Nerajana and Shiva Rudra Foundations events.
          </p>
          <div className="pt-2">
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center h-11 px-8 border border-luxury-gold text-luxury-gold font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-luxury-gold hover:text-luxury-black-pure transition-all duration-300"
            >
              PARTNER WITH US ↗
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
