'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'DASHBOARD', path: '/' },
  { label: 'ID CARD & PASS', path: '/id-card' },
  { label: 'MY PROFILE', path: '/profile' },
  { label: 'MY SCORES', path: '/scores' },
  { label: 'RESULT', path: '/result' },
  { label: 'ANNOUNCEMENTS', path: '/announcements' },
  { label: 'DOCUMENTS', path: '/documents' },
];

export function ContestantShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contestant, setContestant] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Body scroll lock and Escape key handling for mobile drawer
  useEffect(() => {
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

  useEffect(() => {
    async function loadContestant() {
      try {
        const res = await fetch(`${API}/contestant/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setContestant(data);
        }
      } catch {}
    }
    loadContestant();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    router.replace('/login');
  };

  const getActivePageName = () => {
    const active = navItems.find((item) => {
      if (item.path === '/') return pathname === '/';
      return pathname.startsWith(item.path);
    });
    return active ? active.label : 'CONTESTANT PORTAL';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* 1. Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0A0A0A] border-r border-luxury-gray-border/20">
        {/* Brand Header */}
        <div className="p-6 border-b border-luxury-gray-border/20 flex flex-col items-center text-center">
          <div className="relative h-14 w-14 rounded-full overflow-hidden border border-luxury-gold/30 mb-3 bg-black">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              fill
              className="object-cover scale-105"
              priority
            />
          </div>
          <span className="font-serif text-sm tracking-wider text-luxury-gold font-light uppercase">
            Siva Rudra
          </span>
          <span className="font-sans text-[9px] tracking-luxury text-luxury-white/40 uppercase mt-0.5 font-bold">
            CONTESTANT PORTAL
          </span>
          {contestant && (
            <div className="mt-3 px-3 py-1 bg-luxury-gold/5 border border-luxury-gold/20 rounded">
              <span className="font-mono text-[11px] font-bold text-luxury-gold block">
                {contestant.id}
              </span>
              <span className="font-sans text-[9px] text-luxury-white/50 uppercase block">
                {contestant.category?.name || 'CONTESTANT'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-4 py-2.5 text-xs font-sans tracking-luxury uppercase transition-all duration-200 rounded-sm ${
                  isActive
                    ? 'bg-luxury-gold/10 text-luxury-gold border-l-2 border-luxury-gold font-bold shadow-sm'
                    : 'text-luxury-white/60 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-luxury-gray-border/20">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 text-left font-sans text-xs tracking-luxury uppercase text-luxury-white/40 hover:text-red-400 hover:bg-red-950/10 transition-colors"
          >
            ← SECURE LOGOUT
          </button>
        </div>
      </aside>

      {/* 2. Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0A0A0A] border-r border-luxury-gray-border/20">
            <div className="p-6 border-b border-luxury-gray-border/20 flex items-center justify-between">
              <span className="font-serif text-sm tracking-wider text-luxury-gold">
                CONTESTANT PORTAL
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-luxury-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center p-2"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 min-h-[44px] text-xs font-sans tracking-luxury uppercase transition-all rounded-sm ${
                      isActive
                        ? 'bg-luxury-gold/10 text-luxury-gold border-l-2 border-luxury-gold font-bold'
                        : 'text-luxury-white/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-luxury-gray-border/20">
              <button
                onClick={handleLogout}
                className="w-full min-h-[44px] flex items-center px-4 text-left font-sans text-xs tracking-luxury uppercase text-red-400"
              >
                ← SECURE LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-luxury-gray-border/20 bg-[#070707] flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-luxury-white/70 hover:text-white"
            >
              ☰
            </button>
            <h1 className="font-serif text-sm tracking-wider text-luxury-white uppercase">
              {getActivePageName()}
            </h1>
          </div>
          {contestant && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-luxury-gold font-bold">
                {contestant.id}
              </span>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
