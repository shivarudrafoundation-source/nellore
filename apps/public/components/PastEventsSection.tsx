'use client';

import React from 'react';
import Link from 'next/link';
import { Event } from '../data/types';
import { SHOW_DEMO_DATA } from '../data/config';
import { demoPastEvents } from '../data/demoData';

export default function PastEventsSection() {
  const events: Event[] = SHOW_DEMO_DATA ? demoPastEvents : [];

  return (
    <section id="past-events" className="py-16 sm:py-24 bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 px-6 sm:px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title block */}
        <div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
            ARCHIVE & HISTORICAL RECORDS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase leading-tight">
            PAST <span className="text-luxury-gold">EVENTS</span>
          </h2>
        </div>

        {events.length === 0 ? (
          /* Premium Empty State */
          <div className="py-20 border border-luxury-gold/15 bg-[#0A0A0A] flex flex-col items-center justify-center text-center space-y-4">
            <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
              STATUS : ARCHIVE EMPTY
            </span>
            <p className="font-serif text-xl md:text-2xl font-light text-luxury-white/50 tracking-wide uppercase">
              NO PAST EVENTS YET
            </p>
            <p className="font-sans text-xs text-[#B8B8B8]/50 max-w-sm">
              Event records will be archived and published here as soon as current schedules complete and verify.
            </p>
          </div>
        ) : (
          /* Past Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Link 
                key={event.id}
                href={`/events/${event.id}`}
                className="group border border-luxury-gray-border/20 bg-[#0A0A0A] p-6 md:p-8 hover:border-luxury-gold/50 transition-all duration-300 flex flex-col justify-between min-h-[220px]"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/50 uppercase">
                      DATE: {event.date}
                    </span>
                    <span className="font-sans text-[9px] text-luxury-gold uppercase tracking-wider font-semibold">
                      COMPLETED
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-light text-luxury-white group-hover:text-luxury-gold transition-colors duration-300 uppercase">
                    {event.name}
                  </h3>
                  <p className="font-sans text-xs text-[#B8B8B8] leading-relaxed line-clamp-3">
                    {event.description}
                  </p>
                </div>
                <div className="pt-6 border-t border-luxury-gray-border/10 flex items-center justify-between text-[11px] font-sans">
                  <span className="text-[#B8B8B8]/50 uppercase">Location:</span>
                  <span className="text-luxury-white">{event.location}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
