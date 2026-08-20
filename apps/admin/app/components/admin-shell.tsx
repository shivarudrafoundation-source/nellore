'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@srf/ui';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'DASHBOARD', path: '/' },
  { label: 'EVENTS', path: '/events' },
  { label: 'CATEGORIES', path: '/categories' },
  { label: 'ROUNDS', path: '/rounds' },
  { label: 'REGISTRATIONS', path: '/registrations' },
  { label: 'CONTESTANTS', path: '/contestants' },
  { label: 'JUDGES', path: '/judges' },
  { label: 'SCORING', path: '/scoring' },
  { label: 'WINNERS', path: '/winners' },
  { label: 'GALLERY', path: '/gallery' },
  { label: 'DOCUMENTS', path: '/documents' },
  { label: 'AUDIT LOGS', path: '/audit-logs' },
  { label: 'SETTINGS', path: '/settings' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Body scroll lock and Escape key handling for mobile drawer
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      router.replace('/login');
    }
  };

  const getActivePageName = () => {
    const activeItem = navItems.find((item) => {
      if (item.path === '/') return pathname === '/';
      return pathname.startsWith(item.path);
    });
    return activeItem ? activeItem.label : 'ORCHESTRATOR';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      
      {/* 1. Desktop Sidebar (Left side, fixed layout) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0A0A0A] border-r border-luxury-gray-border/20">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-luxury-gray-border/10 bg-[#000000]/35">
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-luxury-gold/30">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              fill
              className="object-cover"
            />
          </div>
          <span className="font-serif text-sm tracking-luxury text-luxury-gold font-light uppercase">
            Siva Rudra
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto select-none">
          {navItems.map((item) => {
            const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
            return (
              <Link
                key={item.label}
                href={item.path}
                className={`flex items-center px-4 h-10 font-sans text-[11px] tracking-luxury transition-all duration-300 font-semibold border-l-2 uppercase ${
                  isActive
                    ? 'text-luxury-gold border-luxury-gold bg-luxury-gold/5'
                    : 'text-luxury-white/50 border-transparent hover:text-luxury-gold hover:bg-luxury-gold/2'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer / Logout */}
        <div className="p-4 border-t border-luxury-gray-border/10 bg-[#000000]/15">
          <Button
            variant="text"
            className="w-full text-left font-sans text-[10px] tracking-luxury font-bold text-luxury-gold hover:text-white"
            onClick={handleLogout}
          >
            LOGOUT CONTROL PANEL ↗
          </Button>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex lg:hidden bg-black/75 backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="relative flex flex-col w-full max-w-xs bg-[#0A0A0A] border-r border-luxury-gray-border/20 shadow-2xl animate-slide-in">
            {/* Close Button */}
            <button
              className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-luxury-white/50 hover:text-luxury-gold text-lg font-sans outline-none"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close sidebar navigation"
            >
              ✕
            </button>

            {/* Brand Header */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-luxury-gray-border/10 bg-[#000000]/30">
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-luxury-gold/30">
                <Image
                  src="/brand/logo-circle.jpg"
                  alt="Siva Rudra Foundations"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-serif text-sm tracking-luxury text-luxury-gold font-light uppercase">
                Siva Rudra
              </span>
            </div>

            {/* Nav Menu */}
            <nav className="flex-grow px-4 py-6 space-y-1 overflow-y-auto select-none">
              {navItems.map((item) => {
                const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.label}
                    href={item.path}
                    className={`flex items-center px-4 min-h-[44px] h-11 font-sans text-[11px] tracking-luxury font-semibold border-l-2 uppercase ${
                      isActive
                        ? 'text-luxury-gold border-luxury-gold bg-luxury-gold/5'
                        : 'text-luxury-white/50 border-transparent hover:text-luxury-gold hover:bg-luxury-gold/2'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-luxury-gray-border/10 bg-[#000000]/15">
              <Button
                variant="text"
                className="w-full text-left font-sans text-[10px] tracking-luxury font-bold text-luxury-gold hover:text-white min-h-[44px] flex items-center"
                onClick={handleLogout}
              >
                LOGOUT CONTROL PANEL ↗
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main content frame (Padded according to sidebar offset) */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        
        {/* Compact Header */}
        <header className="h-16 bg-[#0A0A0A] border-b border-luxury-gray-border/20 flex items-center justify-between px-6 lg:px-8 select-none">
          {/* Left Block: Menu button on mobile, page name on desktop */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-luxury-white/70 hover:text-luxury-gold outline-none"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <span className="font-serif text-sm md:text-base tracking-luxury text-luxury-gold uppercase font-light">
              {getActivePageName()}
            </span>
          </div>

          {/* Right Block: Brand Subtitle */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-sans text-[9px] tracking-luxury text-luxury-white/30 uppercase">
              Secure Orchestrator Suite
            </span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
        </header>

        {/* Content frame wrapper */}
        <main className="flex-1 py-8 px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
