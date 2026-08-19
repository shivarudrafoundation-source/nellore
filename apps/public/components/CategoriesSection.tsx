'use client';

import React from 'react';
import { Category } from '../data/types';
import { SHOW_DEMO_DATA } from '../data/config';
import { demoUpcomingEvents } from '../data/demoData';

export default function CategoriesSection() {
  const categories: Category[] = SHOW_DEMO_DATA 
    ? demoUpcomingEvents[0].categories 
    : [];

  return (
    <section id="categories" className="py-24 bg-[#0A0A0A] text-luxury-white border-t border-luxury-gray-border/20 px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
              DIVISIONS & BOUNDARIES
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase leading-tight">
              EXPLORE <span className="text-luxury-gold">CATEGORIES</span>
            </h2>
          </div>
          <p className="font-sans text-xs md:text-sm text-[#B8B8B8] max-w-md leading-relaxed">
            Siva Rudra Foundations hosts division-specific ramp and performance stages, matching strict parameters configured by the event board.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="py-16 border border-luxury-gold/15 bg-[#050505] text-center text-luxury-white/50 font-serif text-lg font-light uppercase">
            NO CATEGORIES CONFIGURED
          </div>
        ) : (
          /* Editorial Columns */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="group border border-luxury-gray-border/20 bg-[#050505] p-6 hover:border-luxury-gold/50 transition-all duration-300 flex flex-col justify-between min-h-[200px]"
              >
                <div className="space-y-4">
                  <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/60 uppercase block">
                    CODE: {cat.code}
                  </span>
                  <h3 className="font-serif text-2xl font-light text-luxury-white group-hover:text-luxury-gold transition-colors duration-300">
                    {cat.name}
                  </h3>
                </div>
                <p className="font-sans text-[11px] text-[#B8B8B8] leading-relaxed pt-4">
                  Dedicated scoring standard and tailored round parameters defined by event rules.
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
