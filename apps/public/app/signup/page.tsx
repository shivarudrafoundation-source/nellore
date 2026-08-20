'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/profile';

  // Step 1: Request OTP, Step 2: Verify & Set Details
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(0);

  // OTP Countdown timer
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (timer > 0) {
      t = setInterval(() => setTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(t);
  }, [timer]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/user/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch verification code.');
      }

      setStep(2);
      setTimer(300); // 5 minutes
      setSuccessMsg('A 6-digit security code has been sent to your email address.');
    } catch (err: any) {
      setError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/user/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password,
          name: name.trim(),
          mobile: mobile.trim(),
          location: location.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed. Please check your OTP.');
      }

      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
            Official Account Creation
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-white tracking-wider mt-2 font-normal">
            SIGN UP
          </h1>
          <p className="text-white/40 text-xs mt-2">
            Create your account to participate in Siva Rudra Foundation events
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs rounded-sm">
            {successMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
                Email Address *
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'SENDING CODE...' : 'CONTINUE WITH EMAIL →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndCreate} className="space-y-4">
            <div className="p-3 bg-[#050505] border border-white/10 text-xs text-white/70 flex justify-between items-center rounded-sm">
              <span>{email}</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[#D4AF37] text-[11px] underline"
              >
                Change
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                  6-Digit Verification Code *
                </label>
                {timer > 0 && (
                  <span className="text-[10px] font-mono text-[#D4AF37]">
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-[#050505] border border-[#D4AF37]/50 focus:border-[#D4AF37] px-4 py-3 text-center text-lg font-mono tracking-widest text-[#D4AF37] placeholder-white/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sravya Reddy"
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1">
                  City / Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nellore"
                  className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1">
                Set Password (min 8 chars) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'CREATING ACCOUNT...' : 'VERIFY & CREATE ACCOUNT'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/50">
            Already have an account?{' '}
            <Link
              href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
              className="text-[#D4AF37] hover:underline font-medium"
            >
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      <Header />
      <div className="pt-24 pb-12 flex-1 flex items-center justify-center">
        <Suspense fallback={<div className="text-center text-[#D4AF37] font-mono text-xs">Loading...</div>}>
          <SignupContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
