'use client';

import React, { useState, useEffect } from 'react';
import { ContestantAuthGuard } from '../components/contestant-auth-guard';
import { ContestantShell } from '../components/contestant-shell';
import { Card, getApiBaseUrl } from '@srf/ui';

function AnnouncementsContent() {
  const API = getApiBaseUrl();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnnouncements() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/contestant/announcements`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load announcements.');
        const data = await res.json();
        setAnnouncements(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-luxury-gray-border/10 rounded" />
        <div className="h-28 bg-luxury-gray-border/10 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/20 text-red-400 font-sans text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
          Official Announcements
        </h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Event Updates, Schedule Notices & Stage Directives
        </p>
      </div>

      {announcements.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-16 text-center">
          <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
            NO ANNOUNCEMENTS
          </span>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card
              key={item.id}
              hoverEffect={false}
              className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 md:p-8 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-luxury-gray-border/10 pb-3">
                <h3 className="font-serif text-lg text-luxury-gold font-light">
                  {item.title}
                </h3>
                <span className="font-mono text-[11px] text-luxury-white/40">
                  {new Date(item.publishedAt || item.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <p className="font-sans text-xs text-luxury-white/80 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContestantAnnouncementsPage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <AnnouncementsContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
