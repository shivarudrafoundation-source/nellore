'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import RegistrationFlow from './RegistrationFlow';
import { PublicEvent } from './UpcomingEventsSection';

interface EventDetailClientProps {
  event: PublicEvent;
  autoOpenRegister?: boolean;
}

export default function EventDetailClient({ event, autoOpenRegister = false }: EventDetailClientProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(autoOpenRegister);
  const isCompleted = event.status === 'COMPLETED';

  const startDateFormatted = new Date(event.startDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const regOpenFormatted = event.registrationOpenDate
    ? new Date(event.registrationOpenDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const regCloseFormatted = event.registrationCloseDate
    ? new Date(event.registrationCloseDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Event Header Card */}
      <div className="border border-luxury-gray-border/20 bg-[#0A0A0A] p-6 sm:p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 justify-between">
        <div className="space-y-4 text-left">
          <span className="font-sans text-[9px] tracking-widest text-luxury-gold uppercase font-bold block">
            {isCompleted ? 'COMPLETED EVENT RECORD' : 'OFFICIAL EVENT ENTRY'}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-light uppercase text-luxury-white">
            {event.name}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs font-sans text-[#B8B8B8]/70">
            <span>📍 {event.location}</span>
            <span className="text-luxury-gold">|</span>
            <span>📅 {startDateFormatted}</span>
            <span className="text-luxury-gold">|</span>
            <span className="text-luxury-gold font-bold">CODE: {event.code}</span>
          </div>
        </div>

        <div className="relative w-28 h-28 p-2 border border-luxury-gold/30 bg-[#050505] flex-shrink-0 shadow-md">
          <div className="relative w-full h-full">
            <Image 
              src={event.logoUrl || '/brand/logo-circle.jpg'} 
              alt={event.name}
              fill
              className="object-contain"
              unoptimized={Boolean(event.logoUrl && (event.logoUrl.startsWith('data:') || event.logoUrl.startsWith('http')))}
            />
          </div>
        </div>
      </div>

      {/* Description Block */}
      <div className="space-y-4">
        <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/50 uppercase block">
          Event Overview & Narrative
        </span>
        <p className="font-sans text-sm md:text-base text-[#B8B8B8] leading-relaxed">
          {event.description}
        </p>
      </div>

      {/* Registration Availability Window Details */}
      <div className="border border-luxury-gray-border/20 bg-[#050505] p-6 space-y-4">
        <span className="font-sans text-[9px] tracking-widest text-luxury-gold uppercase font-bold block">
          Registration Window
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
          <div>
            <span className="text-luxury-white/40 block text-[10px] uppercase">Opening Date</span>
            <span className="text-luxury-white font-medium">{regOpenFormatted || 'Open Now'}</span>
          </div>
          <div>
            <span className="text-luxury-white/40 block text-[10px] uppercase">Closing Date</span>
            <span className="text-luxury-white font-medium">{regCloseFormatted || 'Until Event'}</span>
          </div>
          <div>
            <span className="text-luxury-white/40 block text-[10px] uppercase">Current Status</span>
            <span
              className={`font-bold tracking-widest uppercase text-[10px] px-2 py-0.5 border inline-block mt-0.5 ${
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

      {/* Categories & Divisions Block */}
      <div className="space-y-8 border-t border-luxury-gray-border/20 pt-12">
        <div className="space-y-4">
          <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/50 uppercase block">
            Competitive Divisions
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {event.categories && event.categories.length > 0 ? (
              event.categories.map((cat) => (
                <div 
                  key={cat.id}
                  className="border border-luxury-gray-border/20 bg-[#0A0A0A] p-5 text-left space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <strong className="font-serif text-lg font-light text-luxury-gold uppercase block">
                      {cat.name}
                    </strong>
                    <span className="font-sans text-[9px] text-[#B8B8B8]/50 border border-luxury-gold/20 px-2 py-0.5 uppercase">
                      {cat.code}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#B8B8B8]/60 leading-relaxed">
                    {cat.description || 'Official stage category for Nellore Nerajana.'}
                  </p>
                </div>
              ))
            ) : (
              <p className="font-sans text-xs text-luxury-white/40">No divisions registered yet.</p>
            )}
          </div>
        </div>

        <div className="pt-6 text-center flex flex-wrap justify-center gap-4">
          {event.isRegistrationOpen ? (
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center justify-center h-12 px-12 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300"
            >
              REGISTER NOW ↗
            </button>
          ) : (
            <div className="inline-block p-4 border border-luxury-gray-border/30 bg-white/5 text-luxury-white/50 font-sans text-xs uppercase tracking-luxury">
              {event.registrationStatus === 'NOT_YET_OPEN'
                ? `REGISTRATION OPENS ON ${regOpenFormatted}`
                : event.registrationStatus === 'CLOSED'
                  ? 'REGISTRATION CLOSED FOR THIS EVENT'
                  : 'EVENT CANCELLED'}
            </div>
          )}

          <a
            href="/results"
            className="inline-flex items-center justify-center h-12 px-8 border border-luxury-gold/50 bg-transparent text-luxury-gold font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-luxury-gold/10 transition-all duration-300"
          >
            VIEW OFFICIAL RESULTS ↗
          </a>
        </div>
      </div>

      {/* Registration Flow Modal */}
      <RegistrationFlow
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        selectedEvent={event}
      />
    </div>
  );
}
