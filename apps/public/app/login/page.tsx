'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getApiBaseUrl } from '@srf/ui';

function LoginContent() {
  const API_BASE = getApiBaseUrl();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in
  useEffect(() => {
    fetch(`${API_BASE}/auth/user/profile`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) router.push(returnUrl);
      })
      .catch(() => {});
  }, [router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }

      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-16 px-6">
      <div className="bg-[#0A0A0A] border border-[#D4AF37]/30 p-8 sm:p-10 shadow-2xl rounded-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#D4AF37]">
            Account Authorization
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-white tracking-wider mt-2 font-normal">
            SIGN IN
          </h1>
          <p className="text-white/40 text-xs mt-2">
            Access your registrations, payment status & contestant dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
              Registered Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@example.com"
              className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                Password *
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN TO ACCOUNT'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/50">
            Don&apos;t have an account yet?{' '}
            <Link
              href={`/signup?returnUrl=${encodeURIComponent(returnUrl)}`}
              className="text-[#D4AF37] hover:underline font-medium"
            >
              Sign Up Now →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      <Header />
      <div className="pt-24 pb-12 flex-1 flex items-center justify-center">
        <Suspense fallback={<div className="text-center text-[#D4AF37] font-mono text-xs">Loading...</div>}>
          <LoginContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
