'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'ABOUT', href: '/#about' },
    { label: 'EVENTS', href: '/#events' },
    { label: 'CATEGORIES', href: '/#categories' },
    { label: 'RESULTS & WINNERS', href: '/results' },
    { label: 'GALLERY', href: '/#gallery' },
    { label: 'CONTACT', href: '/#contact' },
  ];

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-luxury-black-obsidian/90 backdrop-blur-md border-b border-luxury-gold/15 py-[16px]' 
            : 'bg-transparent border-b border-transparent py-[28px]'
        }`}
      >
        {/* Proper 3-Column Header Grid Layout */}
        <div className="w-full max-w-7xl mx-auto px-[48px] md:px-[64px] grid grid-cols-[auto_1fr_auto] items-center">
          
          {/* LEFT: Siva Rudra official logo */}
          <Link href="/" className="flex items-center select-none cursor-pointer">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              width={56}
              height={56}
              className="h-[44px] w-[44px] md:h-[56px] md:w-[56px] object-contain"
              priority
            />
          </Link>

          {/* COLUMN 2: Navigation Items (Center - centered properly!) */}
          <nav className="hidden lg:flex items-center justify-center gap-[32px]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="font-sans text-[11px] font-medium tracking-[0.24em] text-luxury-white/60 hover:text-luxury-gold transition-colors duration-300 uppercase"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* COLUMN 3: Register CTA (Right) */}
          <div className="hidden lg:block">
            <Link
              href="/#register"
              className="inline-flex items-center justify-center h-[44px] px-5 border border-luxury-gold/45 bg-transparent text-luxury-gold font-sans text-[10px] font-semibold tracking-[0.2em] uppercase hover:bg-luxury-gold hover:text-luxury-black-pure transition-all duration-300"
            >
              REGISTER NOW ↗
            </Link>
          </div>

          {/* Mobile hamburger trigger (Right on mobile) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex flex-col justify-center items-end w-8 h-8 gap-1.5 focus:outline-none ml-auto z-50 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span 
              className={`h-[1px] bg-luxury-white transition-all duration-300 ${
                mobileMenuOpen ? 'w-6 rotate-45 translate-y-[7px]' : 'w-6'
              }`} 
            />
            <span 
              className={`h-[1px] bg-luxury-white transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-0 w-0' : 'w-4'
              }`} 
            />
            <span 
              className={`h-[1px] bg-luxury-white transition-all duration-300 ${
                mobileMenuOpen ? 'w-6 -rotate-45 -translate-y-[7px]' : 'w-5'
              }`} 
            />
          </button>
        </div>
      </header>

      {/* Fullscreen Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 bg-luxury-black z-40 flex flex-col justify-center px-8 md:px-16 lg:hidden"
          >
            <div className="space-y-8 flex flex-col">
              {navLinks.map((link, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={link.label}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-serif text-2xl md:text-3xl font-light text-luxury-white hover:text-luxury-gold transition-colors duration-300 uppercase tracking-widest block"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: navLinks.length * 0.05 + 0.1 }}
                className="pt-6 border-t border-luxury-gray-border/40"
              >
                <Link
                  href="/#register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center w-full h-12 border border-luxury-gold/45 text-luxury-gold font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-luxury-gold hover:text-luxury-black-pure transition-all duration-300"
                >
                  REGISTER NOW ↗
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
