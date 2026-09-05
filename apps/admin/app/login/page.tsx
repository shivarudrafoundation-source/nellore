'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PageLayout, Card, Input, Button, getApiBaseUrl } from '@srf/ui';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <PageLayout title="ADMIN ACCESS" subtitle="Siva Rudra Foundations">
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
            SECURE ORCHESTRATOR ACCESS
          </span>
        </div>

        <div className="p-0 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@sivarudrafoundation.com"
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

      </div>
    </PageLayout>
  );
}
