'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getApiBaseUrl } from '@srf/ui';

function CompleteProfileContent() {
  const API_BASE = getApiBaseUrl();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/profile';
  const urlToken = searchParams.get('token');

  const [authToken, setAuthToken] = useState<string>('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchInitialData = async (activeToken: string) => {
    setLoading(true);
    setError('');
    try {
      if (!activeToken) {
        router.push(`/login?returnUrl=${encodeURIComponent('/complete-profile')}`);
        return;
      }

      const res = await fetch(`${API_BASE}/auth/user/profile`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to load user profile.');
      }

      const data = await res.json();
      setEmail(data.user?.email || '');
      setName(data.user?.name || '');
      setMobile(data.user?.mobile || '');
      setLocation(data.user?.location || '');
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('srf_user', JSON.stringify(data.user));
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to account server. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let currentToken = urlToken;
    if (urlToken) {
      localStorage.setItem('srf_token', urlToken);
      try {
        const cleanUrl = window.location.pathname + (returnUrl && returnUrl !== '/profile' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '');
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {
        // ignore
      }
    } else if (typeof window !== 'undefined') {
      currentToken = localStorage.getItem('srf_token');
    }

    if (currentToken) {
      setAuthToken(currentToken);
      fetchInitialData(currentToken);
    } else {
      router.push(`/login?returnUrl=${encodeURIComponent('/complete-profile')}`);
    }
  }, [urlToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim().replace(/\D/g, '');
    const trimmedLocation = location.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full official name.');
      return;
    }

    if (!trimmedMobile || trimmedMobile.length !== 10) {
      setError('Please enter a valid 10-digit Indian contact mobile number.');
      return;
    }

    if (!trimmedLocation || trimmedLocation.length < 2) {
      setError('Please enter your city / state (e.g. Nellore, Andhra Pradesh).');
      return;
    }

    setSaving(true);

    try {
      const activeToken = authToken || (typeof window !== 'undefined' ? localStorage.getItem('srf_token') : '');
      const res = await fetch(`${API_BASE}/auth/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          mobile: trimmedMobile,
          location: trimmedLocation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile details.');
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('srf_user', JSON.stringify(data.user));
      }

      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto my-16 px-6 text-center text-[#D4AF37] font-mono text-xs">
        LOADING ACCOUNT PROFILE...
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto my-16 px-6">
      <div className="bg-[#0A0A0A] border border-[#D4AF37]/30 p-8 sm:p-10 shadow-2xl rounded-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#D4AF37]">
            Final Step • Account Setup
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-white tracking-wider mt-2 font-normal">
            COMPLETE YOUR PROFILE
          </h1>
          <p className="text-white/50 text-xs mt-2">
            Please provide your official contact details to participate in Shiva Rudra Foundation events.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email (Readonly) */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
              Verified Email Address
            </label>
            <div className="flex items-center justify-between bg-[#050505] border border-white/10 px-4 py-3 text-sm text-white/70 rounded-sm">
              <span className="font-mono text-xs text-white/90">{email || 'Authenticated'}</span>
              <span className="text-[10px] uppercase font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 border border-emerald-500/30 rounded-xs">
                ✓ Verified
              </span>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Praneeth Badugu"
              className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
            />
          </div>

          {/* Contact Mobile */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
              Contact Mobile Number (10 Digits) *
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3.5 bg-[#111111] border border-r-0 border-white/15 text-white/60 text-xs font-mono">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="9848012345"
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* City / Location */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
              City / District & State *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nellore, Andhra Pradesh"
              className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-4 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {saving ? 'SAVING PROFILE...' : 'SAVE & CONTINUE TO DASHBOARD →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      <Header />
      <div className="pt-24 pb-12 flex-1 flex items-center justify-center">
        <Suspense fallback={<div className="text-center text-[#D4AF37] font-mono text-xs">Loading...</div>}>
          <CompleteProfileContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
