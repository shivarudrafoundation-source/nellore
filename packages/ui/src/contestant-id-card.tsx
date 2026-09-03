'use client';

import React, { useRef } from 'react';

export interface ContestantIdCardProps {
  contestantId: string;
  name?: string;
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

/**
 * Extracts and formats the primary Stage / Chest Number (e.g. MR 1, MS 2, M16, 101)
 * from either manual short codes or full system IDs
 */
function getBadgeNumbers(id: string) {
  if (!id) return { mainNumber: '00', fullId: '' };
  const clean = id.trim().toUpperCase();

  // If it's a standard SRF structured code like SRF-HYD-MR1-2026 or SRF-NLR-MS-101
  const match = clean.match(/^SRF-[A-Z0-9]+-([A-Z]+[- ]?[0-9]+)(?:-[0-9]+)?$/i);
  if (match && match[1]) {
    return {
      mainNumber: match[1].replace('-', ' '),
      fullId: clean,
    };
  }

  return {
    mainNumber: clean,
    fullId: clean,
  };
}

export const ContestantIdCard: React.FC<ContestantIdCardProps> = ({
  contestantId,
  categoryName = 'Contestant Category',
  categoryCode = 'CAT',
  eventName = 'Nellore Nerajana 2026',
  eventCode = 'NN2026',
  eventLogoUrl,
  location = 'Nellore, Andhra Pradesh',
  startDate,
  paymentStatus = 'PAID',
  showPrintButton = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const resolvedEventLogo = eventLogoUrl || '/brand/nellore-nerajana.jpeg';
  const srfLogo = '/brand/logo-circle.jpg';
  const { mainNumber, fullId } = getBadgeNumbers(contestantId);

  const formattedDates = startDate
    ? new Date(startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Official Staging';

  // High-fidelity standalone badge printer for stage / chest number & lanyard cards
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
          <title>Contestant Stage Number - ${mainNumber}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Montserrat:wght@600;700;800;900&family=JetBrains+Mono:wght@800;900&display=swap" rel="stylesheet">
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
                margin: 8mm;
              }
            }
            .badge-print-wrapper {
              width: 100%;
              max-width: 460px;
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
      {/* Official Pageant Staging Chest / Lanyard Card */}
      <div
        id="srf-contestant-id-badge"
        ref={cardRef}
        className="w-full max-w-[460px] bg-gradient-to-b from-[#181818] via-[#0D0D0D] to-[#030303] text-white border-[3px] border-luxury-gold/80 rounded-2xl p-6 sm:p-8 shadow-[0_0_70px_rgba(212,175,55,0.25)] relative overflow-hidden select-none"
        style={{ colorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        {/* Subtle Luxury Watermark / Background Radial Lights */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/10 filter blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-luxury-gold/10 filter blur-3xl rounded-full pointer-events-none" />
        <div className="absolute inset-0 border border-luxury-gold/25 rounded-xl m-2 pointer-events-none" />

        {/* 1. TOP DUAL LOGO HEADER: Shiva Rudra Foundation & Event Logo */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-luxury-gold/40 gap-4 relative z-10">
          {/* LEFT: Shiva Rudra Foundation Official Seal & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-luxury-gold p-0.5 bg-black overflow-hidden flex-shrink-0 shadow-lg">
              <img
                src={srfLogo}
                alt="Shiva Rudra Foundation"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-sans tracking-[0.24em] text-luxury-gold uppercase font-black block leading-tight">
                SIVA RUDRA
              </span>
              <span className="text-[9px] font-sans tracking-[0.18em] text-white/90 uppercase block font-bold">
                FOUNDATIONS
              </span>
              <span className="text-[7px] font-mono text-luxury-gold/70 uppercase tracking-widest block mt-0.5 font-bold">
                OFFICIAL PAGEANT BADGE
              </span>
            </div>
          </div>

          {/* RIGHT: Particular Event Logo */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="text-[11px] font-sans tracking-[0.2em] text-luxury-gold uppercase font-black block leading-tight">
                {eventName.length > 20 ? eventName.slice(0, 20) + '...' : eventName}
              </span>
              <span className="text-[8px] font-mono text-white/70 uppercase tracking-widest block font-semibold">
                {eventCode} OFFICIAL PASS
              </span>
            </div>
            <div className="w-16 h-16 rounded-xl border-2 border-luxury-gold p-1 bg-black overflow-hidden flex-shrink-0 shadow-lg flex items-center justify-center">
              <img
                src={resolvedEventLogo}
                alt={eventName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* 2. MIDDLE / CENTER HERO: GIGANTIC STAGE NUMBER (MR 1, MS 2, M16, etc.) */}
        <div className="my-6 py-6 px-4 bg-gradient-to-b from-luxury-gold/25 via-luxury-gold/10 to-black/80 border-[3px] border-luxury-gold rounded-2xl text-center shadow-[inset_0_0_30px_rgba(212,175,55,0.2)] relative z-10 space-y-2">
          <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.35em] text-luxury-gold font-black block drop-shadow-sm">
            ★ CONTESTANT NUMBER ★
          </span>

          {/* MASSIVE GIGANTIC STAGE NUMBER */}
          <div className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black text-white tracking-wider text-center break-words leading-none drop-shadow-[0_4px_15px_rgba(0,0,0,0.95)] my-2">
            {mainNumber}
          </div>

          {/* Full System ID if different from main stage number */}
          {fullId && fullId !== mainNumber && (
            <div className="pt-2 border-t border-luxury-gold/30">
              <span className="text-[10px] font-mono text-luxury-gold/90 font-bold tracking-widest block">
                REF ID: {fullId}
              </span>
            </div>
          )}
        </div>

        {/* 3. CATEGORY & EVENT DIVISION */}
        <div className="mb-4 text-center relative z-10 space-y-1.5">
          <div className="inline-block px-4 py-1.5 bg-luxury-gold/20 border border-luxury-gold rounded-full text-luxury-gold font-sans text-xs sm:text-sm font-extrabold uppercase tracking-widest shadow-sm">
            {categoryName} {categoryCode ? `• ${categoryCode}` : ''}
          </div>
          <div className="text-[10px] text-white/60 font-sans tracking-wide">
            <span>📍 {location}</span>
            <span className="mx-2 text-luxury-gold">|</span>
            <span className="text-green-400 font-bold">✓ {paymentStatus === 'PAID' ? 'ACCREDITED ENTRY' : paymentStatus}</span>
          </div>
        </div>

        {/* 4. BOTTOM BARCODE & OFFICIAL FOOTER */}
        <div className="pt-3.5 border-t border-luxury-gold/30 flex items-center justify-between gap-3 relative z-10">
          <div className="text-left">
            <div className="font-mono text-[9px] text-luxury-gold font-black tracking-widest uppercase">
              SRF-STAGE-VERIFIED
            </div>
            <div className="font-mono text-[8px] text-white/40 tracking-wider">
              {formattedDates}
            </div>
          </div>

          {/* High-visibility barcode matrix */}
          <div className="flex items-center gap-0.5 h-8 opacity-95">
            {[4, 2, 7, 3, 6, 2, 8, 4, 3, 7, 2, 6, 3, 8, 2, 5, 7, 3, 6, 2, 5, 7, 4].map((h, i) => (
              <div
                key={i}
                className="bg-luxury-gold"
                style={{
                  width: i % 3 === 0 ? '3.5px' : '2px',
                  height: `${h * 3.4}px`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      {showPrintButton && (
        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-8 py-3.5 bg-luxury-gold hover:bg-[#E5C158] text-black font-sans text-xs sm:text-sm uppercase font-black tracking-wider rounded-sm transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.45)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="text-lg">🖨️</span>
            <span>PRINT OFFICIAL STAGE BADGE</span>
          </button>
        </div>
      )}
    </div>
  );
};
