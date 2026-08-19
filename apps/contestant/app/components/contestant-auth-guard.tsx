'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ContestantAuthGuardProps {
  children: React.ReactNode;
}

export function ContestantAuthGuard({ children }: ContestantAuthGuardProps) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API}/contestant/me`, {
          credentials: 'include',
        });

        if (res.ok) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          router.replace('/login');
        }
      } catch (err) {
        setAuthenticated(false);
        router.replace('/login');
      }
    }
    checkAuth();
  }, [router]);

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-luxury-gold/30 border-t-luxury-gold rounded-full animate-spin" />
          <span className="font-sans text-[10px] tracking-widest text-luxury-gold uppercase">
            VERIFYING CONTESTANT ACCESS...
          </span>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return <>{children}</>;
}
