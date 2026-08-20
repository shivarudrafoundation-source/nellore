'use client';

import React from 'react';
import { Winner } from '../data/types';

export default function WinnersResultsSection() {
  const winners: Winner[] = [];

  return (
    <section id="winners" className="py-16 sm:py-24 bg-[#0A0A0A] text-luxury-white border-t border-luxury-gray-border/20 px-6 sm:px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title block */}
        <div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
            QUALIFIED BOARD & LEADERS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase leading-tight">
            WINNERS & <span className="text-luxury-gold">RESULTS</span>
          </h2>
        </div>

        {winners.length === 0 ? (
          /* Premium Empty State */
          <div className="py-20 border border-luxury-gold/15 bg-[#050505] flex flex-col items-center justify-center text-center space-y-4">
            <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
              STATUS : NO SCORES RECORDED
            </span>
            <p className="font-serif text-xl md:text-2xl font-light text-luxury-white/50 tracking-wide uppercase">
              RESULTS WILL BE PUBLISHED AFTER THE EVENT
            </p>
            <p className="font-sans text-xs text-[#B8B8B8]/50 max-w-sm">
              Rounds verification audits are pending. Validated contestant IDs and profiles will generate automatically on round signoffs.
            </p>
          </div>
        ) : (
          /* Winners Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {winners.map((winner) => (
              <div 
                key={winner.contestantId} 
                className="group border border-luxury-gray-border/20 bg-[#050505] p-6 hover:border-luxury-gold/50 transition-all duration-300 flex flex-col items-center text-center space-y-6"
              >
                {/* Winner Portrait Image Card */}
                <div className="relative w-full max-w-[240px] aspect-[3/4] border border-luxury-gold/10 bg-[#0A0A0A] overflow-hidden">
                  {winner.imageUrl ? (
                    <img
                      src={winner.imageUrl}
                      alt={`Rank #${winner.rank} Winner`}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0F0F0F] to-[#050505] p-6 text-center select-none">
                      <svg className="w-10 h-10 text-luxury-gold/25 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-sans text-[8px] tracking-[0.18em] text-[#B8B8B8]/40 uppercase">
                        PORTRAIT PENDING
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-4 w-full">
                  <span className="font-serif text-3xl font-light text-luxury-gold block">
                    #{winner.rank}
                  </span>
                  
                  <div className="space-y-1">
                    <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/50 uppercase block">
                      CONTESTANT ID
                    </span>
                    <span className="font-sans text-xs font-semibold text-luxury-white tracking-wider block">
                      {winner.contestantId}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/50 uppercase block">
                      DIVISION CATEGORY
                    </span>
                    <span className="font-sans text-xs text-luxury-gold uppercase tracking-wider block font-semibold">
                      {winner.categoryCode}
                    </span>
                  </div>

                  {/* Render score ONLY if explicitly published */}
                  {winner.published && winner.finalScore !== undefined && (
                    <div className="pt-2 border-t border-luxury-gray-border/10">
                      <span className="font-sans text-[9px] tracking-widest text-luxury-gold uppercase block mb-1">
                        FINAL SCORE
                      </span>
                      <span className="font-serif text-lg text-luxury-white">
                        {winner.finalScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
