'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '../../components/auth-guard';
import { AdminShell } from '../../components/admin-shell';
import { Card, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function NewContestantContent() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [form, setForm] = useState({
    eventId: '',
    categoryId: '',
    name: '',
    mobile: '',
    email: '',
    gender: 'FEMALE',
    dob: '',
    age: '',
    location: 'Nellore',
    customFields: {
      height: '',
      instagram: '',
      experience: 'None / Beginner',
      profession: '',
      emergencyContact: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=100`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data || []);
          if (d.data?.length > 0) {
            setForm((prev) => ({ ...prev, eventId: d.data[0].id }));
          }
        }
      } catch {}
    }
    loadEvents();
  }, []);

  useEffect(() => {
    if (!form.eventId) return;
    async function loadCategories() {
      try {
        const res = await fetch(`${API}/admin/categories?eventId=${form.eventId}&limit=100`, {
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          setCategories(d.data || []);
          if (d.data?.length > 0) {
            setForm((prev) => ({ ...prev, categoryId: d.data[0].id }));
          }
        }
      } catch {}
    }
    loadCategories();
  }, [form.eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/admin/contestants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create contestant.');
      }

      setSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/contestants"
            className="font-sans text-[10px] text-luxury-gold tracking-luxury uppercase hover:underline mb-2 block"
          >
            ← Back to Contestants
          </Link>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
            Create Contestant
          </h2>
          <p className="font-sans text-xs text-luxury-white/40 tracking-luxury uppercase mt-1">
            Manual Registration & Sequential Contestant ID Assignment
          </p>
        </div>
      </div>

      {success ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-green-500/30 p-8 space-y-6 text-center">
          <div className="w-12 h-12 rounded-full border border-green-500/50 bg-green-500/10 text-green-400 mx-auto flex items-center justify-center text-xl">
            ✓
          </div>
          <div>
            <span className="font-sans text-[10px] tracking-widest text-luxury-gold uppercase font-bold block">
              Official Contestant ID Generated
            </span>
            <h3 className="font-serif text-3xl text-luxury-white font-light mt-1">
              {success.id}
            </h3>
          </div>
          <div className="border-t border-b border-luxury-gray-border/20 py-4 text-xs font-sans text-[#B8B8B8] space-y-1">
            <p><strong>Name:</strong> {success.registration?.baseFields?.name}</p>
            <p><strong>Category:</strong> {success.registration?.category?.name} ({success.registration?.category?.code})</p>
            <p><strong>Event:</strong> {success.event?.name}</p>
            <p><strong>Mobile:</strong> {success.mobile}</p>
          </div>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setSuccess(null);
                setForm((prev) => ({
                  ...prev,
                  name: '',
                  mobile: '',
                  email: '',
                  dob: '',
                  age: '',
                }));
              }}
            >
              Create Another Contestant
            </Button>
            <Link href={`/contestants/${success.id}`}>
              <Button variant="solid">View Profile & Score ↗</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans">
                {error}
              </div>
            )}

            {/* Event & Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                  Event *
                </label>
                <select
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                  required
                  className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                  Pageant Category *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  required
                  className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Personal Details */}
            <div className="border-t border-luxury-gray-border/10 pt-4 space-y-4">
              <span className="font-sans text-[9px] tracking-widest text-luxury-gold uppercase font-bold block">
                Personal Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sravani Reddy"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Gender *
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  >
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="22"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="sravani@example.com"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Nellore"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>
              </div>
            </div>

            {/* Custom Profile Fields */}
            <div className="border-t border-luxury-gray-border/10 pt-4 space-y-4">
              <span className="font-sans text-[9px] tracking-widest text-luxury-gold uppercase font-bold block">
                Profile & Stage Metadata
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Height
                  </label>
                  <input
                    type="text"
                    value={form.customFields.height}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customFields: { ...form.customFields, height: e.target.value },
                      })
                    }
                    placeholder="e.g. 5 ft 8 in"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={form.customFields.instagram}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customFields: { ...form.customFields, instagram: e.target.value },
                      })
                    }
                    placeholder="@sivarudra_pageant"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Pageant / Modeling Experience
                  </label>
                  <select
                    value={form.customFields.experience}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customFields: { ...form.customFields, experience: e.target.value },
                      })
                    }
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  >
                    <option value="None / Beginner">None / Beginner</option>
                    <option value="1-2 Local Shows">1-2 Local Shows</option>
                    <option value="State / National Level">State / National Level</option>
                    <option value="Professional Model">Professional Model</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                    Profession / Occupation
                  </label>
                  <input
                    type="text"
                    value={form.customFields.profession}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customFields: { ...form.customFields, profession: e.target.value },
                      })
                    }
                    placeholder="e.g. Student / Software Engineer"
                    className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-luxury-gray-border/10 pt-6 flex justify-end gap-3">
              <Link href="/contestants">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="solid" type="submit" disabled={loading}>
                {loading ? 'Creating Contestant...' : 'Create Contestant ↗'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function NewContestantPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <NewContestantContent />
      </AdminShell>
    </AuthGuard>
  );
}
