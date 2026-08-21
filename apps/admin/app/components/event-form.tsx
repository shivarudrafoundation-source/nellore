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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');

    // Validate type
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setLogoError('Please select a PNG, JPG, JPEG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (5MB max)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setLogoError('Image file size exceeds the 5MB maximum limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Generate local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Read base64 and upload directly to backend
    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const fileBase64 = await base64Promise;

      const uploadRes = await fetch(`${API}/admin/events/upload-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          fileBase64,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.message || 'Image upload failed.');
      }

      setForm((prev) => ({ ...prev, logoUrl: uploadData.fileUrl }));
    } catch (err: any) {
      setLogoError(err.message || 'Failed to upload logo image.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl('');
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
      new Date(form.registrationOpenDate) >= new Date(form.registrationCloseDate)
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

      const body: any = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };

      if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
      if (form.registrationOpenDate) body.registrationOpenDate = form.registrationOpenDate;
      if (form.registrationCloseDate) body.registrationCloseDate = form.registrationCloseDate;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to save event.');
      }

      const result = await res.json();
      router.push(`/events/${result.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof EventFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key])
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
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
          placeholder="Siva Rudra Pageant 2026"
        />
        <Input
          label="Event Code *"
          value={form.code}
          onChange={(e) => update('code', e.target.value)}
          error={fieldErrors.code}
          placeholder="SRF-NLR-2026"
        />
      </div>

      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-1.5">
          Description *
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          className="w-full bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 py-2 transition-colors outline-none placeholder:text-luxury-gray/40 resize-none"
          placeholder="Event description..."
        />
        {fieldErrors.description && (
          <span className="font-sans text-xs text-red-500 mt-0.5">{fieldErrors.description}</span>
        )}
      </div>

      <Input
        label="Location *"
        value={form.location}
        onChange={(e) => update('location', e.target.value)}
        error={fieldErrors.location}
        placeholder="Nellore, Andhra Pradesh"
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

      {/* DIRECT EVENT LOGO UPLOAD (REPLACING LOGO URL) */}
      <div>
        <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium block mb-2">
          Event Logo (Optional)
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />

        {previewUrl ? (
          <div className="p-4 bg-luxury-black-obsidian border border-luxury-gold/30 rounded-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#050505] border border-luxury-gold/20 rounded-sm flex items-center justify-center p-2 overflow-hidden flex-shrink-0">
              <img
                src={previewUrl}
                alt="Event Logo Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <p className="text-xs text-luxury-white/80 font-mono">
                {uploadingLogo ? 'Uploading logo to storage...' : 'Logo attached successfully'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={handleReplaceLogo}
                  disabled={uploadingLogo}
                  className="px-3 py-1.5 bg-luxury-gold/10 hover:bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40 text-xs font-mono tracking-wider uppercase transition-colors"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/30 text-xs font-mono tracking-wider uppercase transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 border border-dashed border-luxury-gray-border hover:border-luxury-gold/60 bg-luxury-black-obsidian/50 cursor-pointer rounded-sm text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto mb-2 text-luxury-gold/60 group-hover:text-luxury-gold transition-colors flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs font-mono text-luxury-white/70 uppercase tracking-wider group-hover:text-luxury-gold transition-colors">
              Click or drag to upload Event Logo
            </p>
            <p className="text-[10px] text-luxury-white/40 mt-1 font-mono">
              PNG, JPG, JPEG, or WEBP (Max 5MB)
            </p>
          </div>
        )}

        {logoError && (
          <p className="font-sans text-xs text-red-500 mt-1.5">{logoError}</p>
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
