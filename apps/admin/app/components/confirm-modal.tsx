'use client';

import React from 'react';
import { Button } from '@srf/ui';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'DELETE',
  cancelLabel = 'CANCEL',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-luxury-gray-border/30 w-full max-w-md mx-4 p-8 space-y-6 shadow-2xl">
        <h3 className="font-serif text-xl font-light text-luxury-white tracking-wide">
          {title}
        </h3>
        <p className="font-sans text-sm text-luxury-white/50 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            variant="text"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'PROCESSING...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
