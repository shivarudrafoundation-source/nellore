'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getApiBaseUrl } from '@srf/ui';

function SignupContent() {
  const API_BASE = getApiBaseUrl();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/profile';

  // 3-Step Wizard: 1: Account (Name + Email), 2: Verify OTP, 3: Create Password
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const maskEmail = (str: string) => {
    if (!str.includes('@')) return str;
    const [user, domain] = str.split('@');
    if (user.length <= 2) return `${user}***@${domain}`;
    return `${user.slice(0, 2)}${'*'.repeat(Math.max(3, user.length - 2))}@${domain}`;
  };

  // STEP 1: Name + Email Submission -> Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/user/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch verification code.');
      }

      setStep(2);
      setTimer(300); // 5 minutes
      setSuccessMsg(`We sent a 6-digit verification code to ${maskEmail(trimmedEmail)}.`);
    } catch (err: any) {
      setError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (timer > 0 || loading) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/user/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to resend OTP. Please try again.');
      }

      setTimer(300);
      setSuccessMsg('A fresh verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP -> Issue Signed Token
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/user/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: trimmedOtp,
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid verification code.');
      }

      setSignupToken(data.signupToken);
      setStep(3);
      setSuccessMsg('Email verified successfully! Please set your account password.');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Create Password & Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/user/signup/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signupToken,
          password,
          confirmPassword,
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Account creation failed. Please try again.');
      }

      router.push(returnUrl);
    } catch (err: any) {
      setError(err.message || 'Account creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-16 px-6">
      <div className="bg-[#0A0A0A] border border-[#D4AF37]/30 p-8 sm:p-10 shadow-2xl rounded-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#D4AF37]">
            Official Account Creation
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-white tracking-wider mt-2 font-normal">
            SIGN UP
          </h1>
          <p className="text-white/40 text-xs mt-1">
            Create your official account to participate in Siva Rudra Foundation events
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 text-[10px] font-mono tracking-widest uppercase">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-[#D4AF37] font-bold' : step > 1 ? 'text-white/80' : 'text-white/30'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 1 ? 'bg-[#D4AF37] text-black font-bold' : step > 1 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
              {step > 1 ? '✓' : '1'}
            </span>
            <span>Account</span>
          </div>
          <span className="text-white/20">→</span>
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-[#D4AF37] font-bold' : step > 2 ? 'text-white/80' : 'text-white/30'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 2 ? 'bg-[#D4AF37] text-black font-bold' : step > 2 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
              {step > 2 ? '✓' : '2'}
            </span>
            <span>Verify</span>
          </div>
          <span className="text-white/20">→</span>
          <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-[#D4AF37] font-bold' : 'text-white/30'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step === 3 ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/10 text-white/40'}`}>
              3
            </span>
            <span>Password</span>
          </div>
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

        {/* STEP 1: NAME + EMAIL */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sravya Reddy"
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
              />
            </div>

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
              {loading ? 'CHECKING...' : 'CONTINUE WITH EMAIL →'}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-3 bg-[#050505] border border-white/10 text-xs text-white/70 flex justify-between items-center rounded-sm">
              <div>
                <p className="text-[10px] uppercase font-mono text-white/40">Verifying</p>
                <p className="font-mono text-white/90">{maskEmail(email)}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[#D4AF37] text-[11px] underline hover:text-white"
              >
                Change
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                  6-Digit Verification Code *
                </label>
                {timer > 0 ? (
                  <span className="text-[10px] font-mono text-[#D4AF37]">
                    Expires in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-red-400">
                    Code Expired
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
                autoFocus
                className="w-full bg-[#050505] border border-[#D4AF37]/50 focus:border-[#D4AF37] px-4 py-3.5 text-center text-xl font-mono tracking-[0.4em] text-[#D4AF37] placeholder-white/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'VERIFYING CODE...' : 'VERIFY EMAIL →'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timer > 0 || loading}
                className="text-[11px] font-mono text-white/50 hover:text-[#D4AF37] disabled:opacity-30 underline transition-colors"
              >
                {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SET PASSWORD & CREATE ACCOUNT */}
        {step === 3 && (
          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div className="p-3 bg-[#050505] border border-white/10 text-xs text-white/70 rounded-sm">
              <span className="text-emerald-400 text-[10px] font-mono mr-1.5">✓ EMAIL VERIFIED:</span>
              <span className="font-mono text-white/90">{email}</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
                  Password (min 8 chars) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-white/40 hover:text-[#D4AF37] transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 mb-1">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-400 font-mono mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 8 || password !== confirmPassword}
              className="w-full mt-2 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
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
