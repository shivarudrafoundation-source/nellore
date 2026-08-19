'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function AboutSection() {
  return (
    <section id="about" className="py-24 bg-[#050505] text-luxury-white border-t border-luxury-gray-border/20 px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Editorial Top Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          
          {/* Left Large Column */}
          <div className="lg:col-span-5">
            <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
              ABOUT SIVA RUDRA FOUNDATIONS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide leading-tight text-luxury-white">
              WHERE PASSION <br />
              MEETS <span className="text-luxury-gold">OBJECTIVE</span> <br />
              MERIT.
            </h2>
          </div>
          
          {/* Right Description Column */}
          <div className="lg:col-span-7 space-y-6 text-[#B8B8B8] font-sans text-sm md:text-base leading-relaxed">
            <p>
              Siva Rudra Foundations is a premier pageant-style platform hosting live cultural arenas, ramp walks, dance competitions, and fine talent exhibitions. Grounded in transparency and precision, we celebrate cultural distinction across divisions for Kids, Teens, Miss, Ms, and Mr.
            </p>
            <p>
              Our mission is to establish an objective, blind-judged environment where performance dictates outcomes. Every participant walks a path designed to elevate poise and reward creative distinction.
            </p>
          </div>
        </div>

        {/* Minimalist Values Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-luxury-gray-border/10">
          
          <div className="space-y-4">
            <span className="font-serif text-xl text-luxury-gold uppercase tracking-widest block">
              01 / TALENT
            </span>
            <p className="font-sans text-xs text-[#B8B8B8] leading-relaxed">
              Exhibitions designed to provide dancers, artists, and performers a structural arena to showcase their technical prowess and presence.
            </p>
          </div>
          
          <div className="space-y-4">
            <span className="font-serif text-xl text-luxury-gold uppercase tracking-widest block">
              02 / GRACE
            </span>
            <p className="font-sans text-xs text-[#B8B8B8] leading-relaxed">
              Fostering poise, presentation, and confidence across our runway pageantry. Celebrating personal expression in every movement.
            </p>
          </div>
          
          <div className="space-y-4">
            <span className="font-serif text-xl text-luxury-gold uppercase tracking-widest block">
              03 / EXCELLENCE
            </span>
            <p className="font-sans text-xs text-[#B8B8B8] leading-relaxed">
              Ensuring the highest standards of auditability, security, and integrity, resulting in trusted, meritocratic results.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
