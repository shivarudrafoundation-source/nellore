import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      <Header />
      <div className="pt-32 pb-20 px-6 flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="relative h-20 w-20 rounded-full overflow-hidden border border-[#D4AF37]/40 bg-black mb-6 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
          <Image
            src="/brand/logo-circle.jpg"
            alt="Siva Rudra Foundations"
            fill
            className="object-cover scale-105"
            priority
          />
        </div>
        <span className="font-mono text-xs tracking-[0.3em] uppercase text-[#D4AF37] mb-2 block">
          404 • Resource Not Found
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-white font-light uppercase tracking-wider mb-3">
          Page Not Available
        </h1>
        <p className="font-sans text-xs text-white/50 leading-relaxed mb-8 max-w-sm">
          The requested page could not be located. You can return to the main platform or sign in to your contestant account.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/"
            className="h-11 px-6 border border-[#D4AF37] bg-[#D4AF37] text-black font-semibold text-xs uppercase tracking-wider hover:bg-[#E5C158] transition-colors rounded-sm inline-flex items-center justify-center"
          >
            ← Return to Home
          </Link>
          <Link
            href="/login"
            className="h-11 px-6 border border-white/20 text-white/80 hover:text-white hover:border-[#D4AF37] text-xs uppercase tracking-wider transition-colors rounded-sm inline-flex items-center justify-center"
          >
            Sign In / Sign Up →
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
