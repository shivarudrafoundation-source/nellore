'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ContestantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [contestantId, setContestantId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY' | 'SUCCESS'>('REQUEST');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Handle Standard 3-Factor Contestant Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/contestant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          contestantId: contestantId.trim().toUpperCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid Contestant ID, email, or password.');
      }

      // Successful login creates secure HTTPOnly cookie
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password - Request OTP
  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      const res = await fetch(`${API}/auth/contestant/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch password reset OTP.');
      }

      setForgotStep('VERIFY');
      setForgotSuccess(data.message || 'A secure 6-digit OTP has been sent to your email.');
    } catch (err: any) {
      setForgotError(err.message || 'Unable to request password reset OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Forgot Password - Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New password and confirmation do not match.');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch(`${API}/auth/contestant/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password.');
      }

      setForgotStep('SUCCESS');
      setForgotSuccess('Your password has been successfully updated. You may now sign in.');
    } catch (err: any) {
      setForgotError(err.message || 'Password reset failed.');
    } finally {
      setForgotLoading(false);
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
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-6">
          {error && (
            <p className="font-sans text-xs text-red-400 tracking-wide bg-red-950/30 border border-red-500/30 p-3 text-center">
              {error}
            </p>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                Registered Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. contestant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40 tracking-wide"
              />
            </div>

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
              <div className="flex justify-between items-center mb-1">
                <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury">
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotStep('REQUEST');
                    setShowForgotModal(true);
                  }}
                  className="font-sans text-[10px] text-luxury-gold hover:underline uppercase tracking-wider"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full bg-luxury-gold text-black font-bold" disabled={loading}>
                {loading ? 'AUTHENTICATING...' : 'ENTER CONTESTANT PORTAL ↗'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gold/50 max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div>
              <span className="font-sans text-[10px] tracking-luxury text-luxury-gold uppercase font-bold block">
                SECURITY VERIFICATION
              </span>
              <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide mt-1">
                Reset Contestant Password
              </h3>
            </div>

            {forgotError && (
              <p className="font-sans text-xs text-red-400 bg-red-950/30 border border-red-500/30 p-3 text-center">
                {forgotError}
              </p>
            )}

            {forgotSuccess && forgotStep !== 'SUCCESS' && (
              <p className="font-sans text-xs text-luxury-gold bg-luxury-gold/10 border border-luxury-gold/20 p-3 text-center">
                {forgotSuccess}
              </p>
            )}

            {forgotStep === 'REQUEST' && (
              <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. contestant@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white placeholder:text-luxury-white/20 outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={forgotLoading}
                    className="bg-luxury-gold text-black font-bold"
                  >
                    {forgotLoading ? 'SENDING OTP...' : 'REQUEST OTP ↗'}
                  </Button>
                </div>
              </form>
            )}

            {forgotStep === 'VERIFY' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    6-Digit Verification OTP *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-mono text-center text-sm text-luxury-gold tracking-widest outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    New Password (Min 8 Characters) *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForgotStep('REQUEST')}
                    disabled={forgotLoading}
                  >
                    BACK
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={forgotLoading}
                    className="bg-luxury-gold text-black font-bold"
                  >
                    {forgotLoading ? 'UPDATING...' : 'UPDATE PASSWORD ↗'}
                  </Button>
                </div>
              </form>
            )}

            {forgotStep === 'SUCCESS' && (
              <div className="space-y-4 text-center">
                <p className="font-sans text-xs text-green-400 bg-green-950/30 border border-green-500/30 p-3">
                  {forgotSuccess}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-luxury-gold text-black font-bold"
                  onClick={() => {
                    setShowForgotModal(false);
                    setPassword('');
                  }}
                >
                  RETURN TO LOGIN ↗
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

