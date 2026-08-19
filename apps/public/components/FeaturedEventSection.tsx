'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicEvent } from './UpcomingEventsSection';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FeaturedEventSectionProps {
  onRegisterClick: (event: PublicEvent) => void;
}

export default function FeaturedEventSection({ onRegisterClick }: FeaturedEventSectionProps) {
  const [featuredEvent, setFeaturedEvent] = useState<PublicEvent | null>(null);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch(`${API}/public/events`);
        if (res.ok) {
          const data: PublicEvent[] = await res.json();
          if (data && data.length > 0) {
            // Pick active or first upcoming event
            const activeOrFirst = data.find((e) => e.status === 'ACTIVE') || data[0];
            setFeaturedEvent(activeOrFirst);
          }
        }
      } catch (err) {
        console.error('Failed to load featured event:', err);
      }
    }
    loadFeatured();
  }, []);

  if (!featuredEvent) return null;

  const posterSrc = featuredEvent.logoUrl || '/brand/nellore-nerajana.jpeg';
  const startDateFormatted = new Date(featuredEvent.startDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="py-24 bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 px-[48px] md:px-[64px] relative overflow-hidden">
      {/* Background glow overlay */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[35vw] h-[35vh] bg-luxury-gold/5 filter blur-3xl rounded-full z-0 select-none pointer-events-none" />

      <div className="max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Left Column: Event Visual Poster Banner */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="relative w-full max-w-md aspect-[4/3] border border-luxury-gold/30 overflow-hidden shadow-[0_0_35px_rgba(212,175,55,0.12)] bg-[#0A0A0A] group">
              <Image
                src={posterSrc}
                alt={featuredEvent.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 pointer-events-none" />
            </div>
          </div>

          {/* Right Column: Event Content */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="space-y-4">
              <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                FEATURED ENTRY SHOWCASE
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase leading-tight text-luxury-white">
                {featuredEvent.name}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs font-sans text-[#B8B8B8]/70 pt-1">
                <span>📍 {featuredEvent.location}</span>
                <span className="text-luxury-gold">|</span>
                <span>📅 {startDateFormatted}</span>
              </div>
            </div>

            <p className="font-sans text-sm md:text-base text-[#B8B8B8] leading-relaxed max-w-xl">
              {featuredEvent.description}
            </p>

            {/* Categories and details */}
            <div className="space-y-3 pt-2">
              <span className="font-sans text-[10px] tracking-widest text-[#B8B8B8]/50 uppercase block">
                Available Divisions
              </span>
              <div className="flex flex-wrap gap-3">
                {featuredEvent.categories && featuredEvent.categories.length > 0 ? (
                  featuredEvent.categories.map((cat) => (
                    <span 
                      key={cat.id}
                      className="font-sans text-xs px-4 py-1.5 border border-luxury-gold/20 bg-[#0A0A0A] text-luxury-gold uppercase tracking-wider font-semibold"
                    >
                      {cat.name}
                    </span>
                  ))
                ) : (
                  <span className="font-sans text-xs text-luxury-white/40">General Open Category</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {featuredEvent.isRegistrationOpen ? (
                <button
                  onClick={() => onRegisterClick(featuredEvent)}
                  className="inline-flex items-center justify-center h-12 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300 select-none"
                >
                  REGISTER NOW ↗
                </button>
              ) : (
                <span className="inline-flex items-center justify-center h-12 px-8 border border-luxury-gray-border/30 bg-white/5 text-luxury-white/40 font-sans text-xs font-semibold tracking-luxury uppercase cursor-not-allowed">
                  {featuredEvent.registrationStatus.replace(/_/g, ' ')}
                </span>
              )}
              <Link
                href={`/events/${featuredEvent.code}`}
                className="inline-flex items-center justify-center h-12 px-8 border border-luxury-gray-border/60 text-luxury-white font-sans text-xs font-semibold tracking-luxury uppercase hover:border-luxury-gold hover:text-luxury-gold transition-all duration-300 select-none"
              >
                VIEW EVENT ↗
              </Link>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
