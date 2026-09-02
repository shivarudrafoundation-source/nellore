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

  const resolvedEventLogo = eventLogoUrl || '/brand/nellore-nerajana.jpeg';
  const srfLogo = '/brand/logo-circle.jpg';

  const formattedDates = startDate
    ? new Date(startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Official Entry';

  // High-fidelity standalone badge printer
  const handlePrint = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const printWindow = window.open('', '_blank', 'width=800,height=950');
    if (!printWindow) {
      window.print();
      return;
    }

    const cardHtml = cardEl.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contestant ID Pass - ${contestantId}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Montserrat:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700;900&display=swap" rel="stylesheet">
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              background-color: #000000;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
              font-family: 'Montserrat', sans-serif;
            }
            @media print {
              body {
                background-color: transparent;
                padding: 0;
                margin: 0;
              }
              @page {
                size: portrait;
                margin: 10mm;
              }
            }
            .badge-print-wrapper {
              width: 100%;
              max-width: 440px;
              margin: 0 auto;
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'luxury-gold': '#D4AF37',
                    'luxury-gold-rich': '#F3E5AB',
                  }
                }
              }
            }
          </script>
        </head>
        <body class="bg-black text-white">
          <div class="badge-print-wrapper">
            ${cardHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Printable ID Card Container */}
      <div
        id="srf-contestant-id-badge"
        ref={cardRef}
        className="w-full max-w-[450px] bg-gradient-to-b from-[#141414] via-[#0A0A0A] to-[#020202] text-white border-2 border-luxury-gold/70 rounded-2xl p-6 sm:p-7 shadow-[0_0_60px_rgba(212,175,55,0.22)] relative overflow-hidden select-none"
        style={{ colorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        {/* Subtle Luxury Watermark / Background Radial Lights */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/10 filter blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-luxury-gold/10 filter blur-3xl rounded-full pointer-events-none" />
        <div className="absolute inset-0 border border-luxury-gold/20 rounded-xl m-1.5 pointer-events-none" />

        {/* TOP DUAL LOGO HEADER: Shiva Rudra Foundation & Event Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-luxury-gold/40 gap-3 relative z-10">
          {/* LEFT: Shiva Rudra Foundation Official Seal */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-luxury-gold p-0.5 bg-black overflow-hidden flex-shrink-0 shadow-md">
              <img
                src={srfLogo}
                alt="Shiva Rudra Foundation"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-sans tracking-[0.24em] text-luxury-gold uppercase font-bold block leading-tight">
                SIVA RUDRA
              </span>
              <span className="text-[8px] font-sans tracking-[0.16em] text-white/80 uppercase block">
                FOUNDATIONS
              </span>
              <span className="text-[7px] font-mono text-luxury-gold/70 uppercase tracking-widest block mt-0.5 font-semibold">
                OFFICIAL ACCREDITATION
              </span>
            </div>
          </div>

          {/* RIGHT: Specific Event Logo */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="text-[10px] font-sans tracking-[0.2em] text-luxury-gold uppercase font-bold block leading-tight">
                {eventName.length > 20 ? eventName.slice(0, 20) + '...' : eventName}
              </span>
              <span className="text-[8px] font-mono text-white/60 uppercase tracking-widest block">
                {eventCode} OFFICIAL PASS
              </span>
            </div>
            <div className="w-14 h-14 rounded-lg border-2 border-luxury-gold p-0.5 bg-black overflow-hidden flex-shrink-0 shadow-md flex items-center justify-center">
              <img
                src={resolvedEventLogo}
                alt={eventName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* ACCREDITATION RIBBON */}
        <div className="py-3 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-luxury-gold/15 border border-luxury-gold/60 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-sans text-[10px] tracking-[0.28em] text-luxury-gold uppercase font-extrabold">
              OFFICIAL CONTESTANT ENTRY PASS
            </span>
          </div>
        </div>

        {/* CONTESTANT IDENTITY SECTION */}
        <div className="my-2 p-4 bg-[#080808] border border-luxury-gold/30 rounded-xl relative z-10 space-y-4 shadow-md">
          <div className="flex items-center gap-4">
            {/* Contestant Photo or Monogram Frame */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-luxury-gold p-0.5 bg-black flex-shrink-0 overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center justify-center">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-luxury-gold/30 via-black to-black flex flex-col items-center justify-center text-luxury-gold font-serif text-3xl font-bold">
                  {name ? name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
            </div>

            {/* Name & Category details */}
            <div className="text-left flex-1 min-w-0">
              <h3 className="font-serif text-xl sm:text-2xl font-light text-white tracking-wide truncate">
                {name || 'Contestant Name'}
              </h3>
              <div className="inline-block mt-1 px-3 py-1 bg-luxury-gold/20 border border-luxury-gold/60 rounded-md text-luxury-gold font-sans text-xs font-bold uppercase tracking-wider">
                {categoryName} {categoryCode ? `(${categoryCode})` : ''}
              </div>
              <div className="text-[11px] text-white/60 font-sans mt-1.5">
                {gender && <span>{gender} • </span>}
                {age && <span>{age} yrs • </span>}
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* UNIQUE CONTESTANT ID - HERO GOLD BOX (BIGGER & BOLDER) */}
          <div className="py-4 px-3 bg-gradient-to-r from-luxury-gold/20 via-luxury-gold/35 to-luxury-gold/20 border-2 border-luxury-gold rounded-lg text-center shadow-inner">
            <span className="text-[10px] font-mono uppercase tracking-[0.32em] text-luxury-gold font-black block mb-1">
              ★ UNIQUE CONTESTANT ID ★
            </span>
            <div className="font-mono text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-wider text-center break-all leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {contestantId}
            </div>
          </div>
        </div>

        {/* EVENT & VERIFICATION METADATA */}
        <div className="grid grid-cols-2 gap-3 text-left text-[11px] font-sans py-3 border-t border-b border-white/15 relative z-10">
          <div>
            <span className="text-white/50 uppercase block text-[9px] tracking-wider font-semibold">Event & Venue</span>
            <span className="text-white font-bold block truncate">{eventName}</span>
            <span className="text-luxury-gold block font-medium">{location}</span>
          </div>
          <div className="text-right">
            <span className="text-white/50 uppercase block text-[9px] tracking-wider font-semibold">Accreditation</span>
            <span className="text-green-400 font-bold uppercase inline-flex items-center gap-1">
              <span className="text-xs font-black">✓</span> {paymentStatus === 'PAID' ? 'PAID & VERIFIED' : paymentStatus}
            </span>
            <span className="text-white/50 block text-[10px] mt-0.5">{formattedDates}</span>
          </div>
        </div>

        {/* SECURITY BARCODE / DIGITAL MATRIX */}
        <div className="pt-3.5 flex items-center justify-between gap-3 relative z-10">
          <div className="text-left">
            <div className="font-mono text-[9px] text-luxury-gold tracking-widest uppercase font-bold">
              SRF-OFFICIAL-CONTESTANT-PASS
            </div>
            <div className="font-mono text-[8px] text-white/40 tracking-wider mt-0.5">
              AUTH ID: {contestantId.replace(/[^A-Za-z0-9]/g, '')}
            </div>
          </div>

          {/* Simulated Digital Security Matrix / Barcode */}
          <div className="flex items-center gap-0.5 h-7 opacity-90">
            {[4, 2, 7, 3, 6, 2, 8, 4, 3, 7, 2, 6, 3, 8, 2, 5, 7, 3, 6, 2, 5].map((h, i) => (
              <div
                key={i}
                className="bg-luxury-gold"
                style={{
                  width: i % 3 === 0 ? '3.5px' : '2px',
                  height: `${h * 3.2}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-3.5 pt-2.5 border-t border-luxury-gold/30 text-center">
          <span className="text-[9px] font-sans text-white/50 uppercase tracking-widest block font-medium">
            Issued by Siva Rudra Foundations • Valid for Staging & Venue Access
          </span>
        </div>
      </div>

      {/* Action Controls */}
      {showPrintButton && (
        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-3 bg-luxury-gold hover:bg-[#E5C158] text-black font-sans text-xs uppercase font-extrabold tracking-wider rounded-sm transition-all duration-300 shadow-[0_0_25px_rgba(212,175,55,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="text-base">🖨️</span>
            <span>PRINT OFFICIAL ID CARD</span>
          </button>
        </div>
      )}
    </div>
  );
};
