'use client';

import React, { useState, useEffect } from 'react';
import { ContestantAuthGuard } from '../components/contestant-auth-guard';
import { ContestantShell } from '../components/contestant-shell';
import { Card, getApiBaseUrl } from '@srf/ui';

function DocumentsContent() {
  const API = getApiBaseUrl();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/contestant/documents`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load documents.');
        const data = await res.json();
        setDocuments(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
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
          Official Documents & Rulebooks
        </h2>
        <p className="font-sans text-xs text-luxury-white/30 tracking-luxury uppercase mt-1">
          Stage Guides, Code of Conduct & Competition Guidelines
        </p>
      </div>

      {documents.length === 0 ? (
        <Card hoverEffect={false} className="bg-[#0A0A0A] border-luxury-gray-border/20 p-16 text-center">
          <span className="font-sans text-xs tracking-luxury text-luxury-white/30 uppercase">
            NO CONTESTANT DOCUMENTS AVAILABLE
          </span>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              hoverEffect={false}
              className="bg-[#0A0A0A] border-luxury-gray-border/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="font-sans text-sm font-bold text-luxury-white block">
                  {doc.title}
                </span>
                <span className="font-mono text-xs text-luxury-white/40 block">
                  📄 {doc.filename} • {(doc.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>

              <div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-4 py-2 bg-luxury-gold/10 border border-luxury-gold/30 font-sans text-xs text-luxury-gold font-bold uppercase tracking-luxury hover:bg-luxury-gold/20 transition-colors"
                >
                  VIEW DOCUMENT ↗
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContestantDocumentsPage() {
  return (
    <ContestantAuthGuard>
      <ContestantShell>
        <DocumentsContent />
      </ContestantShell>
    </ContestantAuthGuard>
  );
}
