'use client';

import React from 'react';

export default function Footer() {
  const links = [
    { label: 'ABOUT', href: '#about' },
    { label: 'EVENTS', href: '#events' },
    { label: 'CATEGORIES', href: '#categories' },
    { label: 'PAST EVENTS', href: '#past-events' },
    { label: 'WINNERS', href: '#winners' },
    { label: 'GALLERY', href: '#gallery' },
    { label: 'CONTACT', href: '#contact' },
  ];

  return (
    <footer className="bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 py-16 px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Upper footer grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Logo & Brand Mission */}
          <div className="lg:col-span-5 space-y-4">
            <span className="font-serif text-xl tracking-wider text-luxury-white uppercase block">
              SIVA RUDRA FOUNDATIONS
            </span>
            <p className="font-sans text-xs text-[#B8B8B8] leading-relaxed max-w-sm">
              Celebrating poise, talent, and cultural distinction across pageantry categories under strict standards of objective merit.
            </p>
          </div>

          {/* Navigation links (Center) */}
          <div className="lg:col-span-4 flex flex-wrap gap-x-8 gap-y-4 justify-start">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-sans text-[10px] font-medium tracking-luxury text-[#B8B8B8] hover:text-luxury-gold transition-colors duration-300 uppercase"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Quick Registration (Right) */}
          <div className="lg:col-span-3 lg:text-right space-y-4">
            <span className="font-sans text-[10px] tracking-widest text-[#B8B8B8]/40 uppercase block">
              Pageant Registration
            </span>
            <a
              href="#register"
              className="inline-flex items-center justify-center h-10 px-6 border border-luxury-gold text-luxury-gold font-sans text-[10px] font-semibold tracking-luxury uppercase hover:bg-luxury-gold hover:text-luxury-black-pure transition-all duration-300"
            >
              REGISTER NOW ↗
            </a>
          </div>

        </div>

        {/* Lower footer grid (Copyright) */}
        <div className="pt-8 border-t border-luxury-gray-border/10 flex flex-col md:flex-row justify-between items-center text-[10px] font-sans text-[#B8B8B8]/40 uppercase tracking-widest gap-4">
          <span>
            © {new Date().getFullYear()} SIVA RUDRA FOUNDATIONS. ALL RIGHTS RESERVED.
          </span>
          <span>
            PREMIUM PAGEANTRY SYSTEM
          </span>
        </div>

      </div>
    </footer>
  );
}
