'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { ConfirmModal } from '../components/confirm-modal';
import { Card, Button, Input, getApiBaseUrl } from '@srf/ui';

export interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logoUrl: string;
  websiteUrl: string | null;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SPONSOR_TIERS = [
  { value: 'TITLE', label: 'Title Sponsor' },
  { value: 'POWERED_BY', label: 'Powered By' },
  { value: 'ASSOCIATE', label: 'Associate Sponsor' },
  { value: 'PLATINUM', label: 'Platinum Sponsor' },
  { value: 'GOLD', label: 'Gold Sponsor' },
  { value: 'SILVER', label: 'Silver Sponsor' },
  { value: 'OFFICIAL_PARTNER', label: 'Official Partner' },
];

function getTierBadgeColor(tier: string) {
  switch (tier) {
    case 'TITLE':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'POWERED_BY':
      return 'bg-luxury-gold/20 text-luxury-gold border-luxury-gold/40';
    case 'ASSOCIATE':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'PLATINUM':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    case 'GOLD':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    case 'SILVER':
      return 'bg-slate-400/20 text-slate-300 border-slate-400/40';
    default:
      return 'bg-white/10 text-white/70 border-white/20';
  }
}

function SponsorCard({
  sponsor,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  sponsor: Sponsor;
  onEdit: (sponsor: Sponsor) => void;
  onDelete: (sponsor: Sponsor) => void;
  onToggleActive: (sponsor: Sponsor) => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <Card
      hoverEffect={false}
      className={`bg-[#0A0A0A] border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        sponsor.isActive ? 'border-luxury-gray-border/20 hover:border-luxury-gold/40' : 'border-red-950/40 opacity-70'
      }`}
    >
      <div className="p-5 space-y-4">
        {/* Tier & Status Header */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[9px] font-mono tracking-wider px-2 py-0.5 border rounded-xs uppercase font-bold ${getTierBadgeColor(
              sponsor.tier,
            )}`}
          >
            {sponsor.tier.replace(/_/g, ' ')}
          </span>

          <button
            onClick={() => onToggleActive(sponsor)}
            className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-xs transition-colors font-bold uppercase ${
              sponsor.isActive
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-red-950/60 text-red-400 border border-red-500/40 hover:bg-red-900/60'
            }`}
          >
            {sponsor.isActive ? '● ACTIVE' : '○ INACTIVE'}
          </button>
        </div>

        {/* Logo Preview Container */}
        <div className="relative h-28 w-full bg-black/60 rounded-xs border border-white/5 flex items-center justify-center p-3 overflow-hidden">
          {sponsor.logoUrl && !imageError ? (
            <div className="relative w-full h-full">
              <Image
                src={sponsor.logoUrl}
                alt={sponsor.name}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-white/30 text-center">
              <span className="font-serif text-2xl font-light text-luxury-gold/50">
                {sponsor.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest mt-1">
                {imageError ? 'Invalid Logo URL' : 'No Logo'}
              </span>
            </div>
          )}
        </div>

        {/* Sponsor Details */}
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-light text-white tracking-wide truncate">
            {sponsor.name}
          </h3>
          {sponsor.description && (
            <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
              {sponsor.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
          <span>Sort Order: #{sponsor.order}</span>
          {sponsor.websiteUrl ? (
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-luxury-gold hover:underline truncate max-w-[140px]"
            >
              ↗ {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
            </a>
          ) : (
            <span className="text-white/20">No link</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-3 bg-[#070707] border-t border-white/10 flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit(sponsor)}
          className="px-3 py-1 text-xs font-sans font-medium uppercase tracking-wider text-white/70 hover:text-luxury-gold hover:bg-white/5 rounded-xs transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(sponsor)}
          className="px-3 py-1 text-xs font-sans font-medium uppercase tracking-wider text-red-400/70 hover:text-red-300 hover:bg-red-950/40 rounded-xs transition-colors"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

function SponsorsContent() {
  const API_BASE = getApiBaseUrl();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tier: 'POWERED_BY',
    logoUrl: '',
    websiteUrl: '',
    description: '',
    order: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchSponsors = async () => {
    try {
      setLoading(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('srf_token') : null;
      const res = await fetch(`${API_BASE}/admin/sponsors`, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load sponsors.');
      }

      const data = await res.json();
      setSponsors(data);
    } catch (err: any) {
      setError(err.message || 'Error loading sponsors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, [API_BASE]);

  const handleOpenAddModal = () => {
    setEditingSponsor(null);
    setFormData({
      name: '',
      tier: 'POWERED_BY',
      logoUrl: '',
      websiteUrl: '',
      description: '',
      order: sponsors.length,
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      tier: sponsor.tier,
      logoUrl: sponsor.logoUrl,
      websiteUrl: sponsor.websiteUrl || '',
      description: sponsor.description || '',
      order: sponsor.order,
      isActive: sponsor.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
        setFormError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFormError('Sponsor name must be at least 2 characters.');
      return;
    }

    if (!formData.logoUrl.trim()) {
      setFormError('Please provide a logo image URL or upload an image file.');
      return;
    }

    setSubmitting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('srf_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      if (editingSponsor) {
        // Update
        const res = await fetch(`${API_BASE}/admin/sponsors/${editingSponsor.id}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to update sponsor.');
        }
      } else {
        // Create
        const res = await fetch(`${API_BASE}/admin/sponsors`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to create sponsor.');
        }
      }

      setIsModalOpen(false);
      await fetchSponsors();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (sponsor: Sponsor) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('srf_token') : null;
    try {
      const res = await fetch(`${API_BASE}/admin/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !sponsor.isActive }),
      });

      if (res.ok) {
        setSponsors((prev) =>
          prev.map((s) => (s.id === sponsor.id ? { ...s, isActive: !s.isActive } : s)),
        );
      }
    } catch (err) {
      console.error('Failed to toggle active state', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('srf_token') : null;
    try {
      const res = await fetch(`${API_BASE}/admin/sponsors/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (res.ok) {
        setSponsors((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to delete sponsor.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete sponsor.');
    }
  };

  // Filtered list
  const filteredSponsors = sponsors.filter((sponsor) => {
    const matchesTier = filterTier === 'ALL' || sponsor.tier === filterTier;
    const matchesSearch =
      !searchQuery.trim() ||
      sponsor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sponsor.tier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const activeCount = sponsors.filter((s) => s.isActive).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-luxury-gold">
            Brand Partners & Alliances
          </span>
          <h1 className="font-serif text-3xl font-light text-white tracking-wide mt-1">
            SPONSORS MANAGEMENT
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Configure featured pageant sponsors, presenting brands, and official partners for the public website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAddModal} variant="solid" size="md">
            + ADD NEW SPONSOR
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-sm">
          <span className="text-[10px] font-mono uppercase text-white/40 block">TOTAL SPONSORS</span>
          <span className="text-2xl font-serif text-white mt-1 block">{sponsors.length}</span>
        </div>
        <div className="bg-[#0A0A0A] border border-emerald-500/30 p-4 rounded-sm">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 block">LIVE ON SITE</span>
          <span className="text-2xl font-serif text-emerald-400 mt-1 block">{activeCount}</span>
        </div>
        <div className="bg-[#0A0A0A] border border-amber-500/30 p-4 rounded-sm">
          <span className="text-[10px] font-mono uppercase text-amber-400/70 block">TITLE & POWERED BY</span>
          <span className="text-2xl font-serif text-amber-300 mt-1 block">
            {sponsors.filter((s) => s.tier === 'TITLE' || s.tier === 'POWERED_BY').length}
          </span>
        </div>
        <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-sm">
          <span className="text-[10px] font-mono uppercase text-white/40 block">PARTNERS</span>
          <span className="text-2xl font-serif text-luxury-gold mt-1 block">
            {sponsors.filter((s) => s.tier === 'OFFICIAL_PARTNER' || s.tier === 'ASSOCIATE').length}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0A0A0A] border border-white/10 p-4 rounded-sm">
        {/* Tier Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['ALL', ...SPONSOR_TIERS.map((t) => t.value)].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-3 py-1.5 text-[10px] font-sans font-semibold tracking-wider uppercase rounded-xs transition-colors whitespace-nowrap ${
                filterTier === t
                  ? 'bg-luxury-gold text-black'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {t === 'ALL' ? 'ALL TIERS' : t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search sponsor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 bg-black border border-white/20 text-xs text-white placeholder:text-white/30 rounded-xs focus:outline-none focus:border-luxury-gold"
          />
        </div>
      </div>

      {/* Sponsors Grid / List */}
      {loading ? (
        <div className="py-20 text-center text-luxury-gold font-mono text-xs tracking-widest animate-pulse">
          LOADING SPONSORS DIRECTORY...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded-sm">
          {error}
        </div>
      ) : filteredSponsors.length === 0 ? (
        <div className="p-12 text-center bg-[#0A0A0A] border border-dashed border-white/10 rounded-sm space-y-4">
          <p className="text-sm font-serif text-white/50">No sponsors found matching your criteria.</p>
          <Button onClick={handleOpenAddModal} variant="outline" size="sm">
            Add First Sponsor ↗
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSponsors.map((sponsor) => (
            <SponsorCard
              key={sponsor.id}
              sponsor={sponsor}
              onEdit={handleOpenEditModal}
              onDelete={(s) => setDeleteTarget(s)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Sponsor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-lg p-6 sm:p-8 rounded-sm text-white space-y-6 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-luxury-gold uppercase block">
                  {editingSponsor ? 'Update Record' : 'New Partnership'}
                </span>
                <h2 className="font-serif text-xl font-light uppercase mt-0.5">
                  {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 text-red-300 text-xs rounded-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sponsor Name */}
              <Input
                label="Sponsor / Company Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Royal Jewels & Silks"
                required
              />

              {/* Tier Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium">
                  Sponsorship Tier *
                </label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full h-11 px-3 bg-[#050505] border border-luxury-gray-border text-xs text-white uppercase tracking-wider rounded-xs focus:outline-none focus:border-luxury-gold"
                >
                  {SPONSOR_TIERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logo URL or File Upload */}
              <div className="space-y-2">
                <Input
                  label="Logo Image URL *"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://... or /brand/logo.png"
                />

                <div className="flex items-center gap-3 pt-1">
                  <label className="cursor-pointer px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-sans uppercase tracking-wider text-white rounded-xs transition-colors inline-block">
                    📁 Upload Logo File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-white/40 font-mono">PNG, SVG, JPG, WebP</span>
                </div>

                {/* Live Logo Preview */}
                {formData.logoUrl && (
                  <div className="mt-2 p-3 bg-black border border-white/10 rounded-xs flex items-center justify-center h-20 relative">
                    <img
                      src={formData.logoUrl}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Website Link */}
              <Input
                label="Official Website URL (Optional)"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://partner-website.com"
              />

              {/* Description / Tagline */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium">
                  Tagline / Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Official Styling Partner for Nellore Nerajana 2026..."
                  rows={2}
                  className="w-full p-3 bg-[#050505] border border-luxury-gray-border text-xs text-white placeholder:text-white/20 rounded-xs focus:outline-none focus:border-luxury-gold resize-none"
                />
              </div>

              {/* Sort Order & Active Toggle */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Input
                  label="Display Order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
                  placeholder="0"
                />

                <div className="flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 accent-amber-500 rounded-xs"
                    />
                    <span className="uppercase tracking-wider font-medium text-luxury-gold">
                      Live on Website
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  size="md"
                >
                  CANCEL
                </Button>
                <Button type="submit" variant="solid" size="md" disabled={submitting}>
                  {submitting ? 'SAVING...' : editingSponsor ? 'UPDATE SPONSOR' : 'CREATE SPONSOR'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Sponsor"
        message={`Are you sure you want to remove "${deleteTarget?.name}"? This will permanently remove the sponsor from both the database and public site.`}
        confirmLabel="DELETE"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function SponsorsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <SponsorsContent />
      </AdminShell>
    </AuthGuard>
  );
}
