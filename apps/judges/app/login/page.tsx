'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PageLayout, Card, Input, Button, getApiBaseUrl } from '@srf/ui';

export default function JudgeLogin() {
  const API = getApiBaseUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustReset, setMustReset] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mustReset) {
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (newPassword.length < 12) {
          throw new Error('Password must be at least 12 characters');
        }

        const res = await fetch(`${API}/auth/judge/reset-password`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempToken}`
          },
          credentials: 'include',
          body: JSON.stringify({ newPassword }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Password reset failed');
        }

        setMustReset(false);
        setPassword('');
        setSuccessMsg('Password updated successfully. Please login with your new credentials.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API}/auth/judge/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.mustResetPassword) {
          setMustReset(true);
          setTempToken(data.tempToken);
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'Authentication failed');
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Internal server error');
      setLoading(false);
    }
  };

  return (
    <PageLayout title="JUDGE ACCESS" subtitle="Siva Rudra Foundations">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* Brand Logo Header Block */}
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border border-luxury-gold/30 bg-black">
            <Image
              src="/brand/logo-circle.jpg"
              alt="Siva Rudra Foundations"
              fill
              className="object-cover scale-105"
              priority
            />
          </div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold">
            SECURE SCORING TERMINAL
          </span>
        </div>

        <div className="p-0 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {successMsg && (
              <p className="font-sans text-xs text-luxury-gold tracking-wide bg-luxury-gold/10 border border-luxury-gold/20 p-3 text-center">
                {successMsg}
              </p>
            )}

            {!mustReset ? (
              <>
                <Input
                  label="Judge Email Address or Judge ID"
                  type="text"
                  placeholder="judge@sivarudrafoundation.com or JUDGE-01"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <p className="font-sans text-xs text-luxury-gold tracking-wide text-center uppercase">
                  ⚠️ Forced Password Reset Required
                </p>
                <p className="font-sans text-[11px] text-[#B8B8B8] leading-relaxed text-center">
                  You are logging in with a temporary password. Please configure a permanent credential of at least 12 characters to continue.
                </p>

                <Input
                  label="New Secure Password"
                  type="password"
                  placeholder="At least 12 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </>
            )}

            {error && (
              <p className="font-sans text-xs text-red-500 tracking-wide bg-red-950/20 border border-red-500/20 p-3 text-center">
                {error}
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? 'AUTHENTICATING...' 
                  : mustReset 
                    ? 'RESET PASSWORD & SIGN IN ↗' 
                    : 'ACCESS SCORING INTERFACE ↗'}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </PageLayout>
  );
}
