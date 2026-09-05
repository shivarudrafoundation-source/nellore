'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { ConfirmModal } from '../components/confirm-modal';
import { Card, Button, Input } from '@srf/ui';

interface GalleryItem {
  id: string;
  title: string;
  src: string;
  category: string;
  createdAt?: string;
}

const initialMedia: GalleryItem[] = [
  {
    id: 'med-001',
    title: 'Nellore Nerajana Official Showcase Poster',
    src: '/brand/nellore-nerajana.jpeg',
    category: 'Event Banner',
    createdAt: '2026-08-17',
  },
  {
    id: 'med-002',
    title: 'Siva Rudra Official Brand Emblem',
    src: '/brand/logo.png',
    category: 'Brand Asset',
    createdAt: '2026-08-17',
  },
  {
    id: 'med-003',
    title: 'Siva Rudra Foundations Round Emblem',
    src: '/brand/logo-circle.jpg',
    category: 'Brand Asset',
    createdAt: '2026-08-17',
  },
];

function GalleryCard({
  item,
  isPriority,
  onDelete,
}: {
  item: GalleryItem;
  isPriority: boolean;
  onDelete: (item: GalleryItem) => void;
}) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <Card
      hoverEffect={false}
      className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden group flex flex-col justify-between"
    >
      {/* Fixed aspect ratio image container */}
      <div className="relative aspect-[4/3] w-full bg-[#050505] overflow-hidden">
        {/* 1. Loading Skeleton */}
        {imageStatus === 'loading' && (
          <div className="absolute inset-0 bg-[#0c0c0c] animate-pulse flex items-center justify-center z-10">
            <div className="w-16 h-[1px] bg-luxury-gold/30 overflow-hidden relative">
              <div className="w-8 h-full bg-luxury-gold animate-shimmer" />
            </div>
          </div>
        )}

        {/* 2. Branded Error Fallback */}
        {imageStatus === 'error' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#070707] border border-dashed border-luxury-gold/20 select-none">
            <svg
              className="w-8 h-8 text-luxury-gold/40 mb-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="font-sans text-[9px] tracking-luxury text-luxury-gold uppercase font-bold">
              MEDIA UNAVAILABLE
            </span>
            <span className="font-sans text-[8px] tracking-widest text-luxury-white/30 uppercase mt-1">
              Asset path unresolved
            </span>
          </div>
        ) : (
          /* 3. Smooth Fade-in Next.js Image */
          <Image
            src={item.src}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={isPriority}
            className={`object-cover transition-all duration-500 group-hover:scale-105 ${
              imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
          />
        )}

        {/* Category badge overlay */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none select-none">
          <span className="font-sans text-[9px] tracking-luxury uppercase font-bold px-2 py-0.5 border border-luxury-gold/40 text-luxury-gold bg-black/80 backdrop-blur-sm">
            {item.category}
          </span>
        </div>

        {/* Delete button overlay */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(item)}
            className="px-2 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 font-sans text-[9px] tracking-wider uppercase font-bold rounded-sm shadow-md transition-colors"
          >
            DELETE ✕
          </button>
        </div>

        {/* Subtle gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
      </div>

      {/* Card Description Block */}
      <div className="p-5 space-y-2 border-t border-luxury-gray-border/10 bg-[#0A0A0A] flex flex-col justify-between flex-1">
        <h4 className="font-serif text-sm font-light text-luxury-white tracking-wide leading-snug">
          {item.title}
        </h4>
        <div className="flex items-center justify-between text-[10px] font-mono text-luxury-white/40 pt-2 border-t border-luxury-gray-border/5">
          <span className="truncate max-w-[180px]">{item.src}</span>
          <button
            onClick={() => onDelete(item)}
            className="text-red-400/60 hover:text-red-400 font-sans text-[10px] tracking-wider font-bold uppercase transition-colors"
          >
            DELETE
          </button>
        </div>
      </div>
    </Card>
  );
}

function GalleryContent() {
  const [mediaList, setMediaList] = useState<GalleryItem[]>(initialMedia);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSrc, setNewSrc] = useState('');
  const [newCategory, setNewCategory] = useState('Event Banner');
  const [formError, setFormError] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);

  const handleDeleteMedia = () => {
    if (!deleteTarget) return;
    setMediaList((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    const clean = url.trim();
    // Must be valid absolute path starting with / or http(s) URL
    if (clean.startsWith('/')) return true;
    try {
      const u = new URL(clean);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newTitle.trim()) {
      setFormError('Media title is required.');
      return;
    }

    if (!validateUrl(newSrc)) {
      setFormError('Please provide a valid asset URL (e.g. /brand/image.png or https://...)');
      return;
    }

    const newItem: GalleryItem = {
      id: `med-${Date.now()}`,
      title: newTitle.trim(),
      src: newSrc.trim(),
      category: newCategory,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setMediaList((prev) => [newItem, ...prev]);
    setNewTitle('');
    setNewSrc('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">Media & Event Gallery</h2>
          <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
            Media library, pageant event posters & official photo assets
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          + ADD MEDIA ASSET
        </Button>
      </div>

      {/* Grid of Gallery Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mediaList.map((m, idx) => (
          <GalleryCard
            key={m.id}
            item={m}
            isPriority={idx === 0}
            onDelete={(item) => setDeleteTarget(item)}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="DELETE MEDIA ASSET?"
        message={`Are you sure you want to remove "${deleteTarget?.title}" from the gallery?`}
        confirmLabel="DELETE ASSET"
        onConfirm={handleDeleteMedia}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add Media Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-luxury-gray-border/30 w-full max-w-md p-8 space-y-6 shadow-2xl">
            <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
              Add Media Asset
            </h3>
            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="font-sans text-xs text-red-400">{formError}</p>
              </div>
            )}
            <form onSubmit={handleAddMedia} className="space-y-6">
              <Input
                label="Asset Title *"
                placeholder="e.g. Grand Finale Runway Poster"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <Input
                label="Asset Source URL / Path *"
                placeholder="/brand/nellore-nerajana.jpeg or https://..."
                value={newSrc}
                onChange={(e) => setNewSrc(e.target.value)}
                required
              />

              <div>
                <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
                  Category *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
                >
                  <option value="Event Banner">Event Banner</option>
                  <option value="Brand Asset">Brand Asset</option>
                  <option value="Stage Highlights">Stage Highlights</option>
                  <option value="Winner Gallery">Winner Gallery</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="text" onClick={() => setModalOpen(false)}>
                  CANCEL
                </Button>
                <Button type="submit">
                  SAVE MEDIA ASSET
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <GalleryContent />
      </AdminShell>
    </AuthGuard>
  );
}
