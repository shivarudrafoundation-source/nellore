import React from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import EventDetailClient from '../../../components/EventDetailClient';
import { getApiBaseUrl } from '@srf/ui';

interface PageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    register?: string;
  };
}

async function getEvent(slugOrId: string) {
  const API = getApiBaseUrl();
  try {
    const res = await fetch(`${API}/public/events/${slugOrId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching event details:', err);
    return null;
  }
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const slug = params ? params.slug : undefined;
  const event = slug ? await getEvent(slug) : null;
  const autoOpenRegister = searchParams?.register === 'true' || Boolean(searchParams);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#050505] text-luxury-white flex flex-col justify-between">
        <Header />
        <main className="max-w-7xl mx-auto px-12 py-32 text-center space-y-6">
          <h2 className="font-serif text-3xl font-light text-luxury-gold uppercase tracking-widest">
            EVENT NOT FOUND
          </h2>
          <p className="font-sans text-xs text-[#B8B8B8] max-w-md mx-auto">
            The event identifier does not exist or is currently unpublished.
          </p>
          <Link
            href="/"
            className="inline-flex h-10 px-6 border border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase transition-all duration-300 items-center"
          >
            BACK TO HOME
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-luxury-white flex flex-col justify-between selection:bg-luxury-gold selection:text-luxury-black-pure">
      <Header />

      <main className="flex-grow pt-32 pb-24 px-[48px] md:px-[64px]">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Back button */}
          <div>
            <Link
              href="/"
              className="font-sans text-[10px] tracking-widest text-[#B8B8B8] hover:text-luxury-gold transition-colors duration-300 uppercase block mb-8"
            >
              BACK TO HOME
            </Link>
          </div>

          <EventDetailClient event={event} autoOpenRegister={autoOpenRegister} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
