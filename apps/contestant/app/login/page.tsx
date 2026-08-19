'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, Input, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ContestantLoginPage() {
  const router = useRouter();
  const [contestantId, setContestantId] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/contestant/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contestantId: contestantId.trim(),
          mobile: mobile.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate OTP.');
      }

      setOtpSent(true);
      setSuccessMsg(data.message || 'A secure 6-digit OTP has been dispatched to your mobile.');
    } catch (err: any) {
      setError(err.message || 'Unable to request OTP. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/contestant/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contestantId: contestantId.trim(),
          mobile: mobile.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid or expired OTP.');
      }

      // Successful login creates HTTPOnly cookie
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border border-luxury-gold/30 bg-black">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              fill
              className="object-cover scale-105"
              priority
            />
          </div>
          <span className="font-serif text-lg tracking-wider text-luxury-gold uppercase font-light">
            Siva Rudra Foundations
          </span>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-white/40 uppercase font-bold">
            CONTESTANT PORTAL LOGIN
          </span>
        </div>

        {/* Login Form Container */}
        <div className="p-0 space-y-6">
          {successMsg && (
            <p className="font-sans text-xs text-luxury-gold tracking-wide bg-luxury-gold/10 border border-luxury-gold/20 p-3 text-center">
              {successMsg}
            </p>
          )}

          {error && (
            <p className="font-sans text-xs text-red-400 tracking-wide bg-red-950/20 border border-red-500/20 p-3 text-center">
              {error}
            </p>
          )}

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                  Contestant ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SRF-NLR26-MS-0001"
                  value={contestantId}
                  onChange={(e) => setContestantId(e.target.value.toUpperCase())}
                  className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-mono text-xs text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40 uppercase tracking-wide"
                />
              </div>

              <div>
                <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                  Registered Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-mono text-xs text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'GENERATING OTP...' : 'REQUEST SECURE OTP ↗'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3 bg-[#050505] border border-luxury-gray-border/20 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-luxury-white/40 uppercase font-sans text-[9px] tracking-luxury">
                    Contestant ID:
                  </span>
                  <span className="font-mono text-luxury-gold font-bold">{contestantId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-luxury-white/40 uppercase font-sans text-[9px] tracking-luxury">
                    Mobile:
                  </span>
                  <span className="font-mono text-luxury-white">******{mobile.slice(-4)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="font-sans text-[10px] text-luxury-gold hover:underline uppercase block pt-1"
                >
                  ← Change details
                </button>
              </div>

              <div>
                <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                  Enter 6-Digit OTP *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-12 bg-[#050505] border border-luxury-gray-border/20 px-3 font-mono text-lg text-luxury-gold tracking-widest text-center outline-none focus:border-luxury-gold/40"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'VERIFYING...' : 'VERIFY & ENTER PORTAL ↗'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
