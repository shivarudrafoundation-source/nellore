'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, getApiBaseUrl } from '@srf/ui';

interface EventFormData {
  name: string;
  code: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  logoUrl: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  status: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  eventId?: string;
  mode: 'create' | 'edit';
}

/**
 * Client-side high quality image compressor
 * Ensures images from high-res cameras/phones (5-20MB) are resized and compressed into crisp ~300-800KB images
 */
function compressImageFile(file: File, maxDimension = 1400, quality = 0.88): Promise<{ fileBase64: string; fileSize: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawBase64 = event.target?.result as string;
          resolve({ fileBase64: rawBase64, fileSize: file.size, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mime, quality);
        const approxSize = Math.round((compressedBase64.length * 3) / 4);
        resolve({ fileBase64: compressedBase64, fileSize: approxSize, mimeType: mime });
      };
      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function EventForm({ initialData, eventId, mode }: EventFormProps) {
  const router = useRouter();
  const API = getApiBaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<EventFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    logoUrl: initialData?.logoUrl || '',
    registrationOpenDate: initialData?.registrationOpenDate || '',
    registrationCloseDate: initialData?.registrationCloseDate || '',
    status: initialData?.status || 'DRAFT',
  });

  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.logoUrl || '');
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [manualUrl, setManualUrl] = useState<string>(initialData?.logoUrl || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');

    // Validate mime type
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setLogoError('Please select a valid image (PNG, JPG, JPEG, or WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (Up to 25MB)
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setLogoError('Image file size exceeds the 25MB maximum limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingLogo(true);
    try {
      // Auto compress high resolution photo into optimized web image
      const compressed = await compressImageFile(file);
      setPreviewUrl(compressed.fileBase64);

      const uploadRes = await fetch(`${API}/admin/events/upload-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          mimeType: compressed.mimeType,
          fileSize: compressed.fileSize,
          fileBase64: compressed.fileBase64,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.message || 'Image upload failed.');
      }

      const finalLogoUrl = uploadData.fileUrl || compressed.fileBase64;
      setForm((prev) => ({ ...prev, logoUrl: finalLogoUrl }));
      setPreviewUrl(finalLogoUrl);
    } catch (err: any) {
      setLogoError(err.message || 'Failed to upload logo image.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleApplyManualUrl = () => {
    if (!manualUrl.trim()) {
      setLogoError('Please enter a valid image URL.');
      return;
    }
    setLogoError('');
    setPreviewUrl(manualUrl.trim());
    setForm((prev) => ({ ...prev, logoUrl: manualUrl.trim() }));
  };

  const handleRemoveLogo = () => {
    setPreviewUrl('');
    setManualUrl('');
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReplaceLogo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Event name is required.';
    if (!form.code.trim()) errs.code = 'Event code is required.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (!form.location.trim()) errs.location = 'Location is required.';
    if (!form.startDate) errs.startDate = 'Start date is required.';
    if (!form.endDate) errs.endDate = 'End date is required.';
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      errs.endDate = 'End date must be after start date.';
    }
    if (
      form.registrationOpenDate &&
      form.registrationCloseDate &&
      new Date(form.registrationCloseDate) <= new Date(form.registrationOpenDate)
    ) {
      errs.registrationCloseDate = 'Registration close date must be after open date.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const url = mode === 'create' ? `${API}/admin/events` : `${API}/admin/events/${eventId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const body: Record<string, any> = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        status: form.status,
      };

      if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
      else body.logoUrl = null;

      if (form.registrationOpenDate) {
        body.registrationOpenDate = new Date(form.registrationOpenDate).toISOString();
      }
      if (form.registrationCloseDate) {
        body.registrationCloseDate = new Date(form.registrationCloseDate).toISOString();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Operation failed.');
      }

      const saved = await res.json();
      router.push(`/events/${saved.id || eventId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof EventFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="font-sans text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Event Name *"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={fieldErrors.name}
          placeholder="e.g. Nellore Nerajana 2026"
        />
        <Input
          label="Event Code *"
          value={form.code}
          onChange={(e) => update('code', e.target.value.toUpperCase())}
          error={fieldErrors.code}
          placeholder="e.g. NN2026"
        />
      </div>

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
          Description *
        </label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe the event, highlights, and competition structure..."
          className="w-full bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm p-3 transition-colors outline-none resize-y"
        />
        {fieldErrors.description && (
          <span className="font-sans text-xs text-red-500 mt-0.5 block">{fieldErrors.description}</span>
        )}
      </div>

      <Input
        label="Location *"
        value={form.location}
        onChange={(e) => update('location', e.target.value)}
        error={fieldErrors.location}
        placeholder="e.g. Nellore, Andhra Pradesh"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Start Date *"
          type="datetime-local"
          value={form.startDate}
          onChange={(e) => update('startDate', e.target.value)}
          error={fieldErrors.startDate}
        />
        <Input
          label="End Date *"
          type="datetime-local"
          value={form.endDate}
          onChange={(e) => update('endDate', e.target.value)}
          error={fieldErrors.endDate}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          label="Registration Open Date"
          type="datetime-local"
          value={form.registrationOpenDate}
          onChange={(e) => update('registrationOpenDate', e.target.value)}
          error={fieldErrors.registrationOpenDate}
        />
        <Input
          label="Registration Close Date"
          type="datetime-local"
          value={form.registrationCloseDate}
          onChange={(e) => update('registrationCloseDate', e.target.value)}
          error={fieldErrors.registrationCloseDate}
        />
      </div>

      {/* DIRECT EVENT LOGO UPLOAD & URL MANAGER */}
      <div className="p-5 bg-[#0A0A0A] border border-luxury-gold/30 rounded-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold font-bold block">
              Official Event Logo & Showcase Banner
            </label>
            <span className="text-[11px] text-luxury-white/50">
              This logo will be prominently showcased on the public website for this event.
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#141414] p-0.5 border border-luxury-gray-border/30 rounded text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setLogoInputMode('upload')}
              className={`px-2.5 py-1 uppercase transition-colors ${
                logoInputMode === 'upload' ? 'bg-luxury-gold text-black font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              📁 File Upload
            </button>
            <button
              type="button"
              onClick={() => setLogoInputMode('url')}
              className={`px-2.5 py-1 uppercase transition-colors ${
                logoInputMode === 'url' ? 'bg-luxury-gold text-black font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              🌐 Image URL
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />

        {previewUrl ? (
          <div className="p-4 bg-luxury-black-obsidian border border-luxury-gold/40 rounded-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="w-28 h-28 bg-[#050505] border border-luxury-gold/30 rounded-sm flex items-center justify-center p-2 overflow-hidden flex-shrink-0 relative">
              <img
                src={previewUrl}
                alt="Event Logo Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-mono font-bold tracking-wider uppercase">
                  {uploadingLogo ? 'OPTIMIZING & ATTACHING LOGO...' : 'OFFICIAL LOGO ATTACHED'}
                </span>
              </div>
              <p className="text-[11px] text-luxury-white/60 font-sans">
                This exact logo will appear on the public homepage, event showcase, and registration cards.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleReplaceLogo}
                  disabled={uploadingLogo}
                  className="px-3 py-1 bg-luxury-gold/15 hover:bg-luxury-gold/30 text-luxury-gold border border-luxury-gold/40 text-[11px] font-mono tracking-wider uppercase transition-colors"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="px-3 py-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/30 text-[11px] font-mono tracking-wider uppercase transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : logoInputMode === 'upload' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-luxury-gold/40 hover:border-luxury-gold bg-luxury-black-obsidian/60 cursor-pointer rounded-sm text-center transition-all group"
          >
            <div className="w-12 h-12 mx-auto mb-3 text-luxury-gold/80 group-hover:text-luxury-gold group-hover:scale-110 transition-all flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs font-mono text-luxury-white/90 uppercase tracking-wider font-bold group-hover:text-luxury-gold transition-colors">
              Click or drag to upload Event Logo
            </p>
            <p className="text-[10px] text-luxury-white/50 mt-1.5 font-mono">
              Supports PNG, JPG, JPEG, WEBP (Auto-optimized up to 25MB)
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-[#050505] border border-luxury-gray-border/30 rounded-sm">
            <label className="block text-[11px] font-mono uppercase text-white/70">
              Direct Image URL:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/brand/event-logo.png"
                className="flex-1 bg-black border border-luxury-gold/40 px-3 py-2 text-xs font-mono text-white outline-none focus:border-luxury-gold"
              />
              <button
                type="button"
                onClick={handleApplyManualUrl}
                className="px-4 py-2 bg-luxury-gold text-black font-bold text-xs uppercase font-mono tracking-wider hover:bg-[#E5C158] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {logoError && (
          <div className="p-2.5 bg-red-950/40 border border-red-500/50 rounded text-xs text-red-400 font-sans">
            ⚠️ {logoError}
          </div>
        )}
      </div>

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => update('status', e.target.value)}
          className="w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors outline-none"
        >
          <option value="DRAFT">Draft</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={loading || uploadingLogo}>
          {loading ? 'SAVING...' : mode === 'create' ? 'CREATE EVENT' : 'SAVE EVENT'}
        </Button>
        <Button type="button" variant="text" onClick={() => router.back()}>
          CANCEL
        </Button>
      </div>
    </form>
  );
}
