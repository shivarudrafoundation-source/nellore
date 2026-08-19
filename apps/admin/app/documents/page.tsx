'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '../components/auth-guard';
import { AdminShell } from '../components/admin-shell';
import { Card, Button } from '@srf/ui';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function DocumentsContent() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload Form state
  const [title, setTitle] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`${API}/admin/events?limit=50`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setEvents(d.data || []);
        }
      } catch {}
    }
    loadEvents();
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/admin/documents/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load documents.');
      const data = await res.json();
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        setUploadError('Only PDF (.pdf) files are allowed.');
        setFile(null);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds 10MB limit.');
        setFile(null);
        return;
      }
      setUploadError('');
      setFile(f);
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a PDF file.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      // In production, file goes to Supabase Storage and returns storage URL.
      // We pass the validated file metadata payload.
      const payload = {
        title: title.trim(),
        filename: file.name,
        fileSize: file.size,
        mimeType: 'application/pdf',
        eventId: selectedEventId || undefined,
        fileUrl: `/storage/documents/${file.name}`,
      };

      const res = await fetch(`${API}/admin/documents/pdf/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload document.');

      setUploadSuccess(true);
      setTitle('');
      setFile(null);
      await fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${docTitle}"?`)) return;

    try {
      const res = await fetch(`${API}/admin/documents/pdf/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete document.');
      await fetchDocuments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="font-serif text-2xl font-light text-luxury-white tracking-wide">
          Document & PDF Management
        </h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Official Rulebooks, Guidelines & Evaluation Documents
        </p>
      </div>

      {/* Upload Card */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 space-y-6">
        <span className="font-sans text-[10px] tracking-widest text-luxury-gold uppercase font-bold block">
          Upload PDF Document
        </span>

        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-sans">
              ✓ Document uploaded successfully.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Nellore Nirajan 2026 Official Rulebook"
                className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
              />
            </div>

            <div>
              <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
                Associated Event (Optional)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-10 bg-[#050505] border border-luxury-gray-border/20 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold/40"
              >
                <option value="">Global / No Specific Event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-sans text-[10px] text-luxury-white/50 uppercase tracking-luxury mb-1">
              Select PDF File (Max 10MB) *
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="w-full p-2 bg-[#050505] border border-luxury-gray-border/20 font-sans text-xs text-luxury-white file:mr-4 file:py-1 file:px-3 file:border file:border-luxury-gold/30 file:text-xs file:font-sans file:bg-luxury-gold/10 file:text-luxury-gold"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="solid" type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload PDF Document ↗'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Documents List */}
      <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-0 overflow-hidden">
        <div className="p-4 border-b border-luxury-gray-border/10">
          <span className="font-sans text-[10px] tracking-widest text-luxury-gold uppercase font-bold block">
            Archived Documents
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-luxury-gray-border/10 rounded" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center">
            <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
              NO PDF DOCUMENTS UPLOADED YET
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-luxury-gray-border/10 text-luxury-white/40 uppercase tracking-luxury text-[9px]">
                  <th className="py-3 px-4 pl-6">Title</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-gray-border/5 text-luxury-white">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-luxury-gold/[0.02] transition-colors">
                    <td className="py-3 px-4 pl-6 font-medium">
                      <span className="text-luxury-white block">{doc.title}</span>
                      <span className="text-[10px] text-luxury-gold/70 font-mono">ID: {doc.id}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-luxury-white/70">
                      📄 {doc.filename}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-luxury-white/50">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-luxury-white/40">
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 pr-6 text-right space-x-3">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-sans text-[10px] tracking-luxury text-luxury-gold hover:underline uppercase font-bold"
                      >
                        VIEW ↗
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="font-sans text-[10px] tracking-luxury text-red-400 hover:text-red-300 uppercase font-bold"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <AuthGuard>
      <AdminShell>
        <DocumentsContent />
      </AdminShell>
    </AuthGuard>
  );
}
