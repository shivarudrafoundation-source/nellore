'use client';

import { useEffect } from 'react';

export default function StageLoginPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        window.location.href = 'http://localhost:3000/login';
      } else {
        window.location.href = 'https://sivarudrafoundation.com/login';
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#D4AF37] font-mono text-xs">
      Redirecting to Login Portal...
    </div>
  );
}
