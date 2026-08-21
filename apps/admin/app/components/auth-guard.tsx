'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@srf/ui';

interface User {
  sub: string;
  email: string;
  role: string;
  name?: string;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const apiUrl = getApiBaseUrl();
        const res = await fetch(`${apiUrl}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Unauthorized');
        }

        const data = await res.json();
        // The API returns the user as { user: { sub, role, email, ... } }
        const loggedUser = data.user;

        if (!loggedUser || loggedUser.role !== 'ADMIN') {
          throw new Error('Forbidden');
        }

        if (active) {
          setUser(loggedUser);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          router.replace('/login');
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-4">
        {/* Subtle Luxury Loading indicator */}
        <div className="w-12 h-12 border-t-2 border-luxury-gold rounded-full animate-spin" />
        <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold animate-pulse">
          Securing session...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
