'use client';

import React, { useRef } from 'react';

export interface ContestantIdCardProps {
  contestantId: string;
  name: string;
  categoryName?: string;
  categoryCode?: string;
  eventName?: string;
  eventCode?: string;
  eventLogoUrl?: string | null;
  location?: string;
  startDate?: string;
  endDate?: string;
  photoUrl?: string | null;
  gender?: string;
  dob?: string;
  age?: number | string;
  mobile?: string;
  paymentStatus?: string;
  verifiedDate?: string;
  showPrintButton?: boolean;
}

export const ContestantIdCard: React.FC<ContestantIdCardProps> = ({
  contestantId,
  name,
  categoryName = 'Contestant Category',
  categoryCode = 'CAT',
  eventName = 'Nellore Nerajana 2026',
  eventCode = 'NN2026',
  eventLogoUrl,
  location = 'Nellore, Andhra Pradesh',
  startDate,
  endDate,
  photoUrl,
  gender,
  age,
  paymentStatus = 'PAID',
  showPrintButton = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const resolvedEventLogo = eventLogoUrl || '/brand/nellore-nerajana.jpeg';
  const srfLogo = '/brand/logo-circle.jpg';

  const formattedDates = startDate
    ? new Date(startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Upcoming Event';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Printable ID Card Container */}
      <div
        id="srf-contestant-id-badge"
        ref={cardRef}
        className="w-full max-w-[420px] bg-gradient-to-b from-[#111111] via-[#0A0A0A] to-[#040404] text-white border-2 border-luxury-gold/60 rounded-xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.18)] relative overflow-hidden select-none print:m-0 print:shadow-none print:border-luxury-gold"
      >
        {/* Subtle Luxury Watermark / Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-luxury-gold/5 filter blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-luxury-gold/5 filter blur-3xl rounded-full pointer-events-none" />

        {/* TOP DUAL LOGO HEADER: Shiva Rudra Foundation & Event Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-luxury-gold/30 gap-3 relative z-10">
          {/* LEFT: Shiva Rudra Foundation Official Seal */}
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-full border border-luxury-gold/60 p-0.5 bg-black overflow-hidden flex-shrink-0 shadow-sm">
              <img
                src={srfLogo}
                alt="Shiva Rudra Foundation"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="text-left">
              <span className="text-[9px] font-sans tracking-[0.2em] text-luxury-gold uppercase font-bold block leading-tight">
                SIVA RUDRA
              </span>
              <span className="text-[8px] font-sans tracking-[0.14em] text-white/70 uppercase block">
                FOUNDATIONS
              </span>
              <span className="text-[7px] font-mono text-luxury-gold/60 uppercase tracking-widest block mt-0.5">
                OFFICIAL ACCREDITATION
              </span>
            </div>
          </div>

          {/* RIGHT: Specific Event Logo */}
          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-[9px] font-sans tracking-[0.18em] text-luxury-gold uppercase font-bold block leading-tight">
                {eventName.length > 18 ? eventName.slice(0, 18) + '...' : eventName}
              </span>
              <span className="text-[7px] font-mono text-white/50 uppercase tracking-widest block">
                {eventCode} OFFICIAL PASS
              </span>
            </div>
            <div className="w-12 h-12 rounded-md border border-luxury-gold/60 p-0.5 bg-black overflow-hidden flex-shrink-0 shadow-sm">
              <img
                src={resolvedEventLogo}
                alt={eventName}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* ACCREDITATION RIBBON */}
        <div className="py-2.5 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-luxury-gold/10 border border-luxury-gold/40 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
              OFFICIAL CONTESTANT ENTRY PASS
            </span>
          </div>
        </div>

        {/* CONTESTANT IDENTITY SECTION */}
        <div className="my-3 p-4 bg-[#070707] border border-luxury-gold/20 rounded-lg relative z-10 space-y-4">
          <div className="flex items-center gap-4">
            {/* Contestant Photo or Monogram Frame */}
            <div className="w-20 h-20 rounded-lg border-2 border-luxury-gold/70 p-0.5 bg-black flex-shrink-0 overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center justify-center">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-luxury-gold/20 to-black flex flex-col items-center justify-center text-luxury-gold font-serif text-2xl font-bold">
                  {name ? name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
            </div>

            {/* Name & Category details */}
            <div className="text-left flex-1 min-w-0">
              <h3 className="font-serif text-lg sm:text-xl font-light text-white tracking-wide truncate">
                {name || 'Contestant Name'}
              </h3>
              <div className="inline-block mt-1 px-2.5 py-0.5 bg-luxury-gold/20 border border-luxury-gold/50 rounded text-luxury-gold font-sans text-[11px] font-bold uppercase tracking-wider">
                {categoryName} {categoryCode ? `(${categoryCode})` : ''}
              </div>
              <div className="text-[10px] text-white/50 font-sans mt-1">
                {gender && <span>{gender} • </span>}
                {age && <span>{age} yrs • </span>}
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* UNIQUE CONTESTANT ID - HERO GOLD BOX */}
          <div className="p-3 bg-gradient-to-r from-luxury-gold/20 via-luxury-gold/30 to-luxury-gold/20 border-2 border-luxury-gold rounded-md text-center shadow-inner">
            <span className="text-[9px] font-mono uppercase tracking-[0.28em] text-luxury-gold font-bold block mb-0.5">
              UNIQUE CONTESTANT ID
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] block">
              {contestantId}
            </span>
          </div>
        </div>

        {/* EVENT & VERIFICATION METADATA */}
        <div className="grid grid-cols-2 gap-2 text-left text-[10px] font-sans py-2 border-t border-b border-white/10 relative z-10">
          <div>
            <span className="text-white/40 uppercase block text-[8px] tracking-wider">Event & Venue</span>
            <span className="text-white font-medium block truncate">{eventName}</span>
            <span className="text-luxury-gold/80 block">{location}</span>
          </div>
          <div className="text-right">
            <span className="text-white/40 uppercase block text-[8px] tracking-wider">Payment & Status</span>
            <span className="text-green-400 font-bold uppercase inline-flex items-center gap-1">
              <span className="text-xs">✓</span> {paymentStatus === 'PAID' ? 'PAID & VERIFIED' : paymentStatus}
            </span>
            <span className="text-white/40 block text-[9px]">{formattedDates}</span>
          </div>
        </div>

        {/* SECURITY BARCODE / DIGITAL MATRIX */}
        <div className="pt-3 flex items-center justify-between gap-2 relative z-10">
          <div className="text-left">
            <div className="font-mono text-[8px] text-luxury-gold/80 tracking-widest uppercase">
              SRF-SECURE-ENTRY-PASS
            </div>
            <div className="font-mono text-[7px] text-white/30 tracking-wider">
              AUTH: {contestantId.replace(/[^A-Za-z0-9]/g, '')}-{eventCode}
            </div>
          </div>

          {/* Simulated Digital Security Matrix / Barcode */}
          <div className="flex items-center gap-0.5 h-6 opacity-80">
            {[4, 2, 6, 3, 5, 2, 7, 4, 3, 6, 2, 5, 3, 7, 2, 4, 6, 3, 5].map((h, i) => (
              <div
                key={i}
                className="bg-luxury-gold"
                style={{
                  width: i % 3 === 0 ? '3px' : '1.5px',
                  height: `${h * 3.5}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-3 pt-2 border-t border-luxury-gold/20 text-center">
          <span className="text-[8px] font-sans text-white/40 uppercase tracking-widest block">
            Official Competition Pass • Valid for Staging & Venue Access
          </span>
        </div>
      </div>

      {/* Action Controls */}
      {showPrintButton && (
        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-luxury-gold hover:bg-[#E5C158] text-black font-sans text-xs uppercase font-bold tracking-wider rounded-sm transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>PRINT OFFICIAL ID CARD</span>
          </button>
        </div>
      )}
    </div>
  );
};
