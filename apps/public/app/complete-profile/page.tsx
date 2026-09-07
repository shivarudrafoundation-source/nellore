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
  const urlEmail = searchParams.get('email');
  const urlName = searchParams.get('name');

  const [authToken, setAuthToken] = useState<string>(urlToken || '');
  const [email, setEmail] = useState<string>(urlEmail || '');
  const [name, setName] = useState<string>(urlName || '');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchInitialData = async (activeToken: string) => {
    try {
      if (!activeToken) return;

      const res = await fetch(`${API_BASE}/auth/user/profile`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.status === 401) {
        // Token invalid, only redirect if we have no email
        if (!email) {
          router.push(`/login?returnUrl=${encodeURIComponent('/complete-profile')}`);
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const userData = data.user || data;
        if (userData.email) setEmail(userData.email);
        if (userData.name && !name) setName(userData.name);
        if (userData.mobile) setMobile(userData.mobile);
        if (userData.location) setLocation(userData.location);
        if (typeof window !== 'undefined') {
          localStorage.setItem('srf_user', JSON.stringify(userData));
        }
      }
    } catch (err: any) {
      // Background sync error - non-fatal if token & email are already available
      console.warn('Initial profile background fetch notice:', err.message);
    }
  };

  useEffect(() => {
    let currentToken = urlToken;
    if (urlToken) {
      localStorage.setItem('srf_token', urlToken);
      setAuthToken(urlToken);
    } else if (typeof window !== 'undefined') {
      currentToken = localStorage.getItem('srf_token');
      if (currentToken) {
        setAuthToken(currentToken);
      }
    }

    if (urlEmail) {
      setEmail(urlEmail);
    }
    if (urlName && !name) {
      setName(urlName);
    }

    if (currentToken) {
      fetchInitialData(currentToken);
    } else if (!urlToken && typeof window !== 'undefined' && !localStorage.getItem('srf_token')) {
      router.push(`/login?returnUrl=${encodeURIComponent('/complete-profile')}`);
    }
  }, [urlToken, urlEmail, urlName]);

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

    const activeToken = authToken || (typeof window !== 'undefined' ? localStorage.getItem('srf_token') : '') || '';
    if (!activeToken) {
      setError('Authentication session not found. Please log in again.');
      return;
    }

    setSaving(true);

    try {
      const makePatchRequest = async () => {
        return fetch(`${API_BASE}/auth/user/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            name: trimmedName,
            mobile: trimmedMobile,
            location: trimmedLocation,
          }),
        });
      };

      let res: Response;
      try {
        res = await makePatchRequest();
      } catch (networkErr) {
        // Auto-retry once after 600ms in case of cold start
        await new Promise((resolve) => setTimeout(resolve, 600));
        res = await makePatchRequest();
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile details.');
      }

      const savedUser = data.user || data;
      if (typeof window !== 'undefined' && savedUser) {
        localStorage.setItem('srf_user', JSON.stringify(savedUser));
      }

      router.push(returnUrl);
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Server is connecting. Please click "Save & Continue" again.');
      } else {
        setError(err.message || 'Failed to save profile. Please try again.');
      }
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
