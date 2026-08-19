'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { SHOW_DEMO_DATA } from '../data/config';
import { demoPhotos } from '../data/demoData';

export default function GallerySection() {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const photos = SHOW_DEMO_DATA ? demoPhotos['demo-ev-past-001'] : [];

  return (
    <section id="gallery" className="py-24 bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title block */}
        <div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
            VISUALS & COVERAGE
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase leading-tight">
            THE <span className="text-luxury-gold">GALLERY</span>
          </h2>
        </div>

        {photos.length === 0 ? (
          /* Empty State */
          <div className="py-20 border border-luxury-gold/15 bg-[#0A0A0A] flex flex-col items-center justify-center text-center space-y-4">
            <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
              STATUS : MEDIA EMPTY
            </span>
            <p className="font-serif text-xl md:text-2xl font-light text-luxury-white/50 tracking-wide uppercase">
              NO PHOTOS AVAILABLE
            </p>
            <p className="font-sans text-xs text-[#B8B8B8]/50 max-w-sm">
              Archived pageant media files will appear automatically once event media assets are uploaded in the backend.
            </p>
          </div>
        ) : (
          /* Media Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {photos.map((src, idx) => (
              <div 
                key={idx}
                onClick={() => setActivePhoto(src)}
                className="relative aspect-square border border-luxury-gray-border/20 bg-[#0A0A0A] hover:border-luxury-gold/50 cursor-pointer overflow-hidden transition-all duration-300 group"
              >
                <Image
                  src={src}
                  alt={`Gallery Photo ${idx + 1}`}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  sizes="(max-width: 768px) 50vw, 20vw"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="font-sans text-[10px] tracking-widest text-luxury-gold font-bold uppercase">
                    VIEW ↗
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Overlay */}
        {activePhoto && (
          <div 
            onClick={() => setActivePhoto(null)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative w-full max-w-4xl aspect-video md:aspect-square max-h-[85vh]">
              <Image
                src={activePhoto}
                alt="Enlarged gallery visual"
                fill
                className="object-contain"
                priority
              />
            </div>
            <button 
              onClick={() => setActivePhoto(null)}
              className="absolute top-6 right-6 text-luxury-white hover:text-luxury-gold text-2xl"
            >
              ✕
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
