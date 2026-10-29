'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PageLayout, Card, Input, Button, getApiBaseUrl } from '@srf/ui';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'RESET' | 'SUCCESS'>('REQUEST');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');

  const openForgotModal = () => {
    setForgotEmail(email || 'admin@shivarudrafoundation.com');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccessMessage('');
    setForgotStep('REQUEST');
    setShowForgotModal(true);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/auth/admin/forgot-password/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to request password reset OTP.');
      }

      setForgotSuccessMessage(data.message || 'A 6-digit OTP code was dispatched to Shiva Rudra Foundations official email.');
      setForgotStep('RESET');
    } catch (err: any) {
      setForgotError(err.message || 'Error requesting recovery code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New password and confirmation password do not match.');
      return;
    }

    setForgotLoading(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/auth/admin/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setForgotStep('SUCCESS');
      setEmail(forgotEmail.trim());
      setPassword('');
    } catch (err: any) {
      setForgotError(err.message || 'Error verifying OTP and resetting password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (data.tokens?.accessToken) {
        localStorage.setItem('srf_token', data.tokens.accessToken);
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Internal server error');
      setLoading(false);
    }
  };

  return (
    <PageLayout title="ADMIN ACCESS" subtitle="Shiva Rudra Foundations">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* Brand Logo Header Block */}
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border border-luxury-gold/30 bg-black">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Shiva Rudra Foundations"
              fill
              className="object-cover scale-105"
              priority
            />
          </div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
            SECURE ORCHESTRATOR ACCESS
          </span>
        </div>

        <div className="p-0 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@shivarudrafoundation.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium">
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="font-sans text-[11px] text-luxury-gold/80 hover:text-luxury-gold hover:underline transition-colors uppercase tracking-wider"
                >
                  Forgot Password? ↗
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <p className="font-sans text-xs text-red-500 tracking-wide bg-red-950/20 border border-red-500/20 p-3 text-center">
                {error}
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'AUTHENTICATING...' : 'ACCESS CONTROL PANEL ↗'}
              </Button>
            </div>
          </form>
        </div>

        {/* FORGOT PASSWORD MODAL */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-luxury-gold/40 p-6 md:p-8 rounded-none shadow-[0_0_50px_rgba(212,175,55,0.15)] space-y-6">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 text-luxury-white/50 hover:text-white text-lg font-mono p-1"
                aria-label="Close"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="border-b border-luxury-gold/20 pb-4">
                <div className="flex items-center space-x-2 text-luxury-gold text-xs tracking-[0.2em] uppercase font-bold">
                  <span>SHIVA RUDRA FOUNDATIONS</span>
                  <span>•</span>
                  <span>SECURITY RECOVERY</span>
                </div>
                <h3 className="text-xl font-serif text-white tracking-wide mt-1">
                  Admin Password Recovery
                </h3>
                <p className="text-xs text-luxury-white/60 mt-1 leading-relaxed">
                  Reset your master admin credentials securely via verified single-use OTP.
                </p>
              </div>

              {/* STEP 1: REQUEST OTP */}
              {forgotStep === 'REQUEST' && (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div className="p-3 bg-luxury-gold/10 border border-luxury-gold/30 text-xs text-luxury-gold leading-relaxed">
                    <p className="font-semibold mb-1">🔒 Foundation Authorization Security</p>
                    <p className="text-luxury-white/80">
                      When requested, a 6-digit OTP code is dispatched directly to the official Foundation email (
                      <span className="font-mono text-luxury-gold font-bold">shivarudrafoundation@gmail.com</span>) 
                      and the registered administrator email address.
                    </p>
                  </div>

                  <Input
                    label="Administrator Email"
                    type="email"
                    placeholder="admin@shivarudrafoundation.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotLoading}
                  />

                  {forgotError && (
                    <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-3">
                      {forgotError}
                    </p>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 text-xs font-sans uppercase tracking-wider text-luxury-white/60 hover:text-white transition-colors"
                      disabled={forgotLoading}
                    >
                      Cancel
                    </button>
                    <Button type="submit" size="sm" disabled={forgotLoading}>
                      {forgotLoading ? 'SENDING OTP...' : 'SEND OTP CODE ↗'}
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 2: VERIFY OTP & ENTER NEW PASSWORD */}
              {forgotStep === 'RESET' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {forgotSuccessMessage && (
                    <div className="p-3 bg-green-950/30 border border-green-500/30 text-xs text-green-300">
                      ✓ {forgotSuccessMessage}
                    </div>
                  )}

                  <div className="p-3 bg-black/60 border border-luxury-gold/20 text-xs text-luxury-white/70">
                    Enter the 6-digit verification code delivered to{' '}
                    <span className="text-luxury-gold font-mono">{forgotEmail}</span> /{' '}
                    <span className="text-luxury-gold font-mono">shivarudrafoundation@gmail.com</span>.
                  </div>

                  <Input
                    label="6-Digit OTP Verification Code"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="font-mono tracking-widest text-lg"
                    required
                    disabled={forgotLoading}
                  />

                  <Input
                    label="New Password (Minimum 8 Characters)"
                    type="password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={forgotLoading}
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={forgotLoading}
                  />

                  {forgotError && (
                    <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-3">
                      {forgotError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-luxury-gold/10">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-xs font-sans text-luxury-gold/80 hover:text-luxury-gold underline uppercase tracking-wider"
                      disabled={forgotLoading}
                    >
                      Resend OTP Code
                    </button>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setForgotStep('REQUEST')}
                        className="px-3 py-2 text-xs font-sans uppercase tracking-wider text-luxury-white/60 hover:text-white"
                        disabled={forgotLoading}
                      >
                        Back
                      </button>
                      <Button type="submit" size="sm" disabled={forgotLoading}>
                        {forgotLoading ? 'RESETTING...' : 'SET NEW PASSWORD ↗'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 3: SUCCESS */}
              {forgotStep === 'SUCCESS' && (
                <div className="text-center space-y-5 py-4">
                  <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border-2 border-luxury-gold mx-auto flex items-center justify-center text-luxury-gold text-2xl font-bold">
                    ✓
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-serif text-luxury-gold">Password Reset Successful!</h4>
                    <p className="text-xs text-luxury-white/80 max-w-sm mx-auto leading-relaxed">
                      Your master administrator password has been updated and securely hashed. All previous sessions have been invalidated.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setShowForgotModal(false)}
                  >
                    RETURN TO SIGN IN ↗
                  </Button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
