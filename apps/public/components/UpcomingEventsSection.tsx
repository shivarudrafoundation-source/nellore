'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getApiBaseUrl } from '@srf/ui';

interface PublicCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface PublicEvent {
  id: string;
  name: string;
  code: string;
  location: string;
  startDate: string;
  endDate: string;
  logoUrl: string | null;
  description: string;
  registrationOpenDate: string | null;
  registrationCloseDate: string | null;
  status: string;
  registrationStatus: 'OPEN' | 'NOT_YET_OPEN' | 'CLOSED' | 'CANCELLED';
  isRegistrationOpen: boolean;
  categories: PublicCategory[];
}

interface UpcomingEventsSectionProps {
  onRegisterClick: (event: PublicEvent) => void;
}

export default function UpcomingEventsSection({ onRegisterClick }: UpcomingEventsSectionProps) {
  const API = getApiBaseUrl();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    async function loadEvents() {
      try {
        const res = await fetch(`${API}/public/events`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data || []);
        }
      } catch (err) {
        // Graceful fallback to empty state on timeout or network error
        setEvents([]);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    loadEvents();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <section id="events" className="py-16 sm:py-24 bg-[#0A0A0A] text-luxury-white border-t border-luxury-gray-border/20 px-6 sm:px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header Block */}
        <div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
            CHRONICLE & SCHEDULE
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase">
            UPCOMING <span className="text-luxury-gold">EVENTS</span>
          </h2>
        </div>

        {loading ? (
          /* Skeleton Loader */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-luxury-gray-border/20 bg-[#050505] p-8 space-y-4 animate-pulse">
                <div className="h-12 w-12 bg-luxury-gray-border/20 rounded" />
                <div className="h-6 w-3/4 bg-luxury-gray-border/20 rounded" />
                <div className="h-16 w-full bg-luxury-gray-border/10 rounded" />
                <div className="h-10 w-full bg-luxury-gray-border/20 rounded" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty State */
          <div className="py-20 border border-luxury-gold/15 bg-[#050505] flex flex-col items-center justify-center text-center space-y-4">
            <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
              STATUS : EMPTY
            </span>
            <p className="font-serif text-xl md:text-2xl font-light text-luxury-white/50 tracking-wide uppercase">
              NO UPCOMING EVENTS
            </p>
            <p className="font-sans text-xs text-[#B8B8B8]/50 max-w-sm">
              Please check back later. Real-time pageant updates will populate once configured by the administration.
            </p>
          </div>
        ) : (
          /* Event Card Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => {
              const startDateFormatted = new Date(event.startDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div 
                  key={event.id}
                  className="group border border-luxury-gray-border/30 bg-[#050505] hover:border-luxury-gold/50 transition-all duration-500 flex flex-col justify-between h-full p-6 md:p-8"
                >
                  <div className="space-y-6">
                    {/* Header with Logo */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 border border-luxury-gold/20 flex-shrink-0 bg-black">
                        <Image 
                          src={event.logoUrl || '/brand/logo-circle.jpg'} 
                          alt={event.name} 
                          fill
                          className="object-cover p-0.5"
                        />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-light text-luxury-white group-hover:text-luxury-gold transition-colors duration-300">
                          {event.name}
                        </h3>
                        <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/70 uppercase">
                          CODE: {event.code}
                        </span>
                      </div>
                    </div>

                    <p className="font-sans text-xs text-[#B8B8B8] leading-relaxed line-clamp-3">
                      {event.description}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-luxury-gray-border/10">
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="text-[#B8B8B8]/50 uppercase">Date:</span>
                        <span className="text-luxury-white font-medium">{startDateFormatted}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="text-[#B8B8B8]/50 uppercase">Location:</span>
                        <span className="text-luxury-white font-medium">{event.location}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-sans">
                        <span className="text-[#B8B8B8]/50 uppercase">Divisions:</span>
                        <span className="text-luxury-gold font-medium">
                          {event.categories && event.categories.length > 0
                            ? event.categories.map((c) => c.name).join(', ')
                            : 'Open Categories'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-sans items-center pt-1">
                        <span className="text-[#B8B8B8]/50 uppercase">Registration:</span>
                        <span
                          className={`text-[9px] font-bold tracking-widest px-2 py-0.5 border ${
                            event.isRegistrationOpen
                              ? 'text-green-400 border-green-500/30 bg-green-500/5'
                              : event.registrationStatus === 'NOT_YET_OPEN'
                                ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5'
                                : 'text-red-400 border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          {event.registrationStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-8 mt-auto">
                    <Link
                      href={`/events/${event.code}`}
                      className="flex-grow text-center py-3 border border-luxury-gray-border/60 hover:border-luxury-gold text-luxury-white hover:text-luxury-gold font-sans text-[10px] tracking-widest font-semibold uppercase transition-all duration-300"
                    >
                      VIEW EVENT ↗
                    </Link>
                    {event.isRegistrationOpen ? (
                      <button
                        onClick={() => onRegisterClick(event)}
                        className="flex-grow py-3 border border-luxury-gold bg-luxury-gold hover:bg-transparent text-luxury-black-pure hover:text-luxury-gold font-sans text-[10px] tracking-widest font-semibold uppercase transition-all duration-300"
                      >
                        REGISTER ↗
                      </button>
                    ) : (
                      <span className="flex-grow text-center py-3 border border-luxury-gray-border/30 bg-white/5 text-luxury-white/40 font-sans text-[10px] tracking-widest font-semibold uppercase cursor-not-allowed">
                        {event.registrationStatus.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
