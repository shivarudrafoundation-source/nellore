'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getApiBaseUrl } from '@srf/ui';

function getContestantPortalUrl(): string {
  if (process.env.NEXT_PUBLIC_CONTESTANT_URL) {
    return process.env.NEXT_PUBLIC_CONTESTANT_URL;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3004';
  }
  return 'https://my.sivarudrafoundation.com';
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  location: string | null;
  role: string;
}

interface MyEvent {
  registrationId: string;
  eventId: string;
  eventName: string;
  eventCode: string;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  registrationStatus: string;
  paymentStatus: 'PAID' | 'UNPAID';
  contestantStatus: 'ACTIVE' | 'NOT ASSIGNED';
  contestantId: string | null;
  contestantPortalAllowed: boolean;
  registeredAt: string;
}

export default function ProfilePage() {
  const API_BASE = getApiBaseUrl();
  const CONTESTANT_PORTAL_URL = getContestantPortalUrl();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('srf_token') : null;
      const res = await fetch(`${API_BASE}/auth/user/profile`, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401) {
        router.push('/login?returnUrl=/profile');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load profile.');
      }

      const data = await res.json();
      setProfile(data.user);
      setMyEvents(data.myEvents || []);
      setEditName(data.user.name || '');
      setEditMobile(data.user.mobile || '');
      setEditLocation(data.user.location || '');
    } catch (err: any) {
      setError(err.message || 'Error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('srf_token') : null;
      const res = await fetch(`${API_BASE}/auth/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          mobile: editMobile.trim(),
          location: editLocation.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setProfile(data);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex items-center justify-center pt-24 pb-12">
          <div className="text-center font-mono text-sm tracking-widest text-[#D4AF37]">
            LOADING ACCOUNT DOSSIER...
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      <Header />

      <div className="pt-28 pb-16 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full flex-1">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#D4AF37]">
              User Account Portal
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-white tracking-wider mt-1 font-normal">
              {profile?.name || 'My Account'}
            </h1>
            <p className="text-white/40 text-xs mt-1">
              Registered Member • {profile?.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/#events"
              className="px-4 py-2 bg-[#D4AF37] text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#E5C158] transition-colors rounded-sm"
            >
              Browse Events →
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs uppercase tracking-wider transition-colors rounded-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs rounded-sm">
            Profile details updated successfully.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Profile Information Box */}
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-sm self-start">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-5">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                Personal Profile
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-white/50 hover:text-[#D4AF37] underline transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-[#050505] border border-white/15 focus:border-[#D4AF37] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-[#D4AF37] text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#E5C158] transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 border border-white/15 text-white/60 text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-0.5">
                    Full Name
                  </div>
                  <div className="text-white font-medium">{profile?.name || 'Not provided'}</div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-0.5">
                    Registered Email
                  </div>
                  <div className="text-white font-mono">{profile?.email}</div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-0.5">
                    Contact Number
                  </div>
                  <div className="text-white font-mono">{profile?.mobile || 'Not provided'}</div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-0.5">
                    City / Location
                  </div>
                  <div className="text-white">{profile?.location || 'Not provided'}</div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: My Events & Participation Status */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-sm">
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-6">
                <div>
                  <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                    My Events ({myEvents.length})
                  </h2>
                  <p className="text-white/40 text-xs mt-0.5">
                    Event registration, payment verification & contestant portal credentials
                  </p>
                </div>
              </div>

              {myEvents.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-sm">
                  <div className="text-white/40 text-xs font-mono mb-3">
                    YOU HAVE NOT REGISTERED FOR ANY EVENTS YET
                  </div>
                  <Link
                    href="/#events"
                    className="inline-block px-5 py-2.5 bg-[#D4AF37] text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#E5C158] transition-colors rounded-sm"
                  >
                    Explore Upcoming Pageants →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myEvents.map((evt) => (
                    <div
                      key={evt.registrationId}
                      className="bg-[#050505] border border-white/10 hover:border-[#D4AF37]/40 p-5 rounded-sm transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 rounded-sm">
                              {evt.categoryName}
                            </span>
                            <span className="text-xs text-white/40 font-mono">
                              Ref: {evt.registrationId.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-lg font-serif text-white tracking-wide mt-2">
                            {evt.eventName}
                          </h3>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
                          {evt.paymentStatus === 'PAID' ? (
                            <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-sm">
                              ✓ PAYMENT VERIFIED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-sm">
                              ⏳ PAYMENT PENDING
                            </span>
                          )}

                          {evt.contestantStatus === 'ACTIVE' ? (
                            <span className="px-2.5 py-1 bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] text-[10px] font-mono font-semibold uppercase tracking-wider rounded-sm">
                              CONTESTANT ACTIVE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-white/5 border border-white/15 text-white/50 text-[10px] font-mono uppercase tracking-wider rounded-sm">
                              CONTESTANT NOT ASSIGNED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contestant ID & Access Box */}
                      <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                            Assigned Contestant ID
                          </div>
                          <div className="text-sm font-mono font-bold text-[#D4AF37] mt-0.5">
                            {evt.contestantId ? evt.contestantId : 'Pending Admin Verification'}
                          </div>
                        </div>

                        <div>
                          {evt.contestantPortalAllowed && evt.contestantId ? (
                            <a
                              href={CONTESTANT_PORTAL_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#E5C158] transition-colors rounded-sm shadow-md"
                            >
                              OPEN CONTESTANT PORTAL ↗
                            </a>
                          ) : (
                            <div className="text-[11px] font-mono text-white/40 italic">
                              🔒 CONTESTANT ACCESS PENDING
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
