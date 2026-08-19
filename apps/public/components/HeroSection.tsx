'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { heroCategories } from '../config/hero.config';
import HeroContestantCanvas from './HeroContestantCanvas';

export default function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);
  const [hasLoadedFirstTime, setHasLoadedFirstTime] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeCategory = heroCategories[activeIndex];

  // Sequential transition loop: MR -> MISS -> KIDS -> Loop
  useEffect(() => {
    const duration = 6000;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % heroCategories.length);
    }, duration);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update initial load flag once first category frames load successfully
  useEffect(() => {
    if (!isCanvasLoading && !hasLoadedFirstTime) {
      setHasLoadedFirstTime(true);
    }
  }, [isCanvasLoading, hasLoadedFirstTime]);

  const handleLoadingState = (loading: boolean) => {
    setIsCanvasLoading(loading);
  };

  return (
    <div className="relative w-full h-screen min-h-[750px] lg:min-h-[820px] bg-[#050505] overflow-hidden flex flex-col justify-between pt-[110px] pb-[32px] selection:bg-luxury-gold selection:text-luxury-black-pure">
      
      {/* 1. Initial Page Load Treatment */}
      <AnimatePresence>
        {!hasLoadedFirstTime && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 bg-[#050505] z-50 flex flex-col items-center justify-center space-y-6"
          >
            <div className="text-center space-y-3">
              <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                SIVA RUDRA FOUNDATIONS
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-light text-luxury-white tracking-wide uppercase">
                EXCELLENCE IN EVERY STEP
              </h2>
            </div>
            {/* Subtle Gold Loading Bar */}
            <div className="w-40 h-[1px] bg-luxury-gold/25 relative overflow-hidden">
              <motion.div 
                animate={{ x: [-160, 160] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="absolute left-0 top-0 bottom-0 w-16 bg-luxury-gold"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Hero Background Ambience & Lighting Atmosphere */}
      <div className="absolute inset-0 bg-[#050505] z-0 pointer-events-none select-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/40 via-transparent to-black/60 z-0 pointer-events-none select-none" />
      
      {/* Golden Spotlights & Vertical Light Rays */}
      <div className="absolute right-[18%] lg:right-[18%] xl:right-[21%] top-[10%] bottom-[20%] w-[180px] lg:w-[220px] bg-gradient-to-r from-transparent via-luxury-gold/5 to-transparent blur-3xl z-0 pointer-events-none select-none" />
      <div className="absolute right-[28%] lg:right-[32%] top-[5%] bottom-[25%] w-[1px] bg-gradient-to-b from-transparent via-luxury-gold/20 to-transparent blur-[1px] z-0 pointer-events-none select-none" />
      <div className="absolute right-[20%] lg:right-[24%] top-[15%] bottom-[25%] w-[1px] bg-gradient-to-b from-transparent via-luxury-gold/15 to-transparent blur-[1px] z-0 pointer-events-none select-none" />
      <div className="absolute right-[36%] lg:right-[40%] top-[10%] bottom-[25%] w-[1px] bg-gradient-to-b from-transparent via-luxury-gold/10 to-transparent blur-[1px] z-0 pointer-events-none select-none" />

      {/* Golden Floor Light Glow under Runway */}
      <div className="absolute bottom-[10vh] left-[65%] -translate-x-1/2 w-[45vw] h-[20vh] bg-gradient-to-t from-luxury-gold/5 via-transparent to-transparent blur-3xl pointer-events-none select-none z-0" />

      {/* 3. CENTER-RIGHT: Perspective Glossy Runway Floor under Contestant */}
      <div className="absolute bottom-0 right-[14%] lg:right-[18%] xl:right-[21%] w-[320px] sm:w-[360px] lg:w-[42%] h-[35vh] overflow-hidden pointer-events-none select-none z-0">
        <div 
          className="w-full h-full origin-bottom"
          style={{
            transform: 'perspective(400px) rotateX(65deg)',
            background: 'linear-gradient(to top, rgba(15,15,15,0.9), rgba(0,0,0,1))',
            borderLeft: '1.5px solid rgba(212,175,55,0.35)',
            borderRight: '1.5px solid rgba(212,175,55,0.35)',
            boxShadow: '0 0 50px rgba(212,175,55,0.06)'
          }}
        >
          <div className="w-full h-full bg-gradient-to-t from-luxury-gold/8 via-transparent to-transparent opacity-60" />
        </div>
      </div>

      {/* 4. Main Grid Content Wrapper */}
      <div className="w-full max-w-7xl mx-auto px-[48px] md:px-[64px] z-20 relative flex-grow flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full">
          
          {/* LEFT SIDE: Headline, Description and CTAs */}
          <div className="lg:col-span-5 space-y-8 text-left z-20">
            <div className="space-y-[24px]">
              <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
                SIVA RUDRA FOUNDATIONS
              </span>
              
              <h1 className="font-serif text-[42px] sm:text-[54px] lg:text-[clamp(58px,5.5vw,86px)] font-light tracking-[-0.01em] leading-[0.88] text-luxury-white">
                EXCELLENCE <br />
                <span className="text-luxury-gold">IN EVERY</span> <br />
                STEP
              </h1>
            </div>

            <p className="font-sans text-xs md:text-[15px] text-[#B8B8B8] leading-[1.6] max-w-[460px]">
              A platform celebrating confidence, talent, grace and excellence across pageantry and performance.
            </p>

            {/* Rectangular Action Buttons */}
            <div className="flex flex-row items-center gap-[12px] pt-2">
              <a
                href="#register"
                className="inline-flex items-center justify-center h-[48px] px-6 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-transparent hover:text-luxury-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:-translate-y-0.5 transition-all duration-300 select-none"
              >
                REGISTER NOW ↗
              </a>
              <a
                href="#events"
                className="inline-flex items-center justify-center h-[48px] px-6 border border-luxury-gray-border/60 text-luxury-white font-sans text-[11px] font-semibold tracking-[0.16em] uppercase hover:border-luxury-gold hover:text-luxury-gold hover:-translate-y-0.5 transition-all duration-300 select-none"
              >
                EXPLORE EVENTS ↗
              </a>
            </div>
          </div>

          {/* MIDDLE & RIGHT SIDE: Column space */}
          <div className="hidden lg:block lg:col-span-7" />

          {/* MOBILE ONLY: Category Name Below */}
          <div className="lg:hidden flex flex-col justify-center items-start text-left pb-12 z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="space-y-[12px]"
              >
                <h3 className="font-serif text-[22px] font-light text-luxury-gold tracking-widest uppercase">
                  {activeCategory.name}
                </h3>
                <div className="w-10 h-[0.5px] bg-luxury-gold/50" />
                <p className="font-sans text-[10px] tracking-luxury text-luxury-white/50 uppercase leading-relaxed">
                  {activeCategory.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* 5. CENTER-RIGHT: Contestant Absolute Positioning Wrapper */}
      {/* Height increased by 10%: h-[55vh] sm:h-[61vh] lg:h-[91vh], max-h-[462px] sm:max-h-[528px] lg:max-h-[858px] */}
      <div className="hero-contestant z-10 pointer-events-none select-none mt-8 lg:mt-0 relative lg:absolute bottom-0 right-1/2 translate-x-1/2 lg:translate-x-0 lg:right-[18%] xl:right-[21%] w-[320px] sm:w-[360px] lg:w-[42%] h-[55vh] sm:h-[61vh] lg:h-[91vh] max-h-[462px] sm:max-h-[528px] lg:max-h-[858px] flex items-end justify-center">
        <HeroContestantCanvas
          category={activeCategory}
          onLoadingStateChange={handleLoadingState}
        />
      </div>

      {/* 6. DESKTOP ONLY: Category Info (beside contestant) */}
      <div className="absolute top-[42%] lg:top-[44%] right-[5%] lg:right-[7%] xl:right-[9%] z-20 text-left flex flex-col items-start hidden lg:flex">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory.id}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="space-y-[16px] text-left"
          >
            <h3 className="font-serif text-[24px] md:text-[28px] font-light text-luxury-gold tracking-widest uppercase">
              {activeCategory.name}
            </h3>
            
            <div className="w-12 lg:w-16 h-[0.5px] bg-luxury-gold/50" />
            
            <p className="font-sans text-[10px] md:text-[11px] tracking-luxury text-luxury-white/50 uppercase leading-relaxed max-w-[200px]">
              {activeCategory.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 7. BOTTOM VALUE PILLARS */}
      <div className="w-full max-w-7xl mx-auto px-[48px] md:px-[64px] z-20 border-t border-luxury-gray-border/20 pt-6 pb-2 hidden lg:grid grid-cols-4 gap-8">
        
        <div className="flex gap-4 items-start text-left">
          <svg className="w-5 h-5 text-luxury-gold flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L16 7L21 4L19 17H5L3 4L8 7L12 3Z" />
          </svg>
          <div>
            <h4 className="font-serif text-[10px] font-semibold text-luxury-white uppercase tracking-[0.16em]">PREMIUM EVENTS</h4>
            <p className="text-[10px] text-[#B8B8B8]/70 mt-1 font-sans leading-relaxed">World-class pageant experiences</p>
          </div>
        </div>

        <div className="flex gap-4 items-start text-left">
          <svg className="w-5 h-5 text-luxury-gold flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <div>
            <h4 className="font-serif text-[10px] font-semibold text-luxury-white uppercase tracking-[0.16em]">DIVERSE CATEGORIES</h4>
            <p className="text-[10px] text-[#B8B8B8]/70 mt-1 font-sans leading-relaxed">Kids, Teens, Miss, Ms & Mr categories</p>
          </div>
        </div>

        <div className="flex gap-4 items-start text-left">
          <svg className="w-5 h-5 text-luxury-gold flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <div>
            <h4 className="font-serif text-[10px] font-semibold text-luxury-white uppercase tracking-[0.16em]">TALENT PLATFORM</h4>
            <p className="text-[10px] text-[#B8B8B8]/70 mt-1 font-sans leading-relaxed">Nurturing talent and building confidence</p>
          </div>
        </div>

        <div className="flex gap-4 items-start text-left">
          <svg className="w-5 h-5 text-luxury-gold flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a4 4 0 100-8 4 4 0 000 8zm0 0v5m-4 0h8m-9-10h1.5m7.5 0H20" />
          </svg>
          <div>
            <h4 className="font-serif text-[10px] font-semibold text-luxury-white uppercase tracking-[0.16em]">LEGACY OF EXCELLENCE</h4>
            <p className="text-[10px] text-[#B8B8B8]/70 mt-1 font-sans leading-relaxed">Creating winners and inspiring generations</p>
          </div>
        </div>

      </div>

    </div>
  );
}
