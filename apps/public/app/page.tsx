'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import UpcomingEventsSection, { PublicEvent } from '../components/UpcomingEventsSection';
import FeaturedEventSection from '../components/FeaturedEventSection';
import CategoriesSection from '../components/CategoriesSection';
import PastEventsSection from '../components/PastEventsSection';
import WinnersResultsSection from '../components/WinnersResultsSection';
import GallerySection from '../components/GallerySection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import RegistrationFlow from '../components/RegistrationFlow';
import { getApiBaseUrl } from '@srf/ui';

export default function Home() {
  const API = getApiBaseUrl();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);

  const handleRegisterClick = (event: PublicEvent) => {
    setSelectedEvent(event);
    setIsRegisterOpen(true);
  };

  const handleGlobalRegisterCTA = async () => {
    try {
      const res = await fetch(`${API}/public/events`);
      if (res.ok) {
        const events: PublicEvent[] = await res.json();
        const active = events.find((e) => e.isRegistrationOpen) || events[0];
        if (active) {
          handleRegisterClick(active);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }
    alert('No active events are currently accepting registrations.');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-luxury-white overflow-x-hidden selection:bg-luxury-gold selection:text-luxury-black-pure relative">
      <Header />
      
      {/* Cinematic Hero */}
      <HeroSection />
      
      {/* About SIVA RUDRA FOUNDATIONS */}
      <AboutSection />
      
      {/* Upcoming Events */}
      <UpcomingEventsSection onRegisterClick={handleRegisterClick} />
      
      {/* Featured Event */}
      <FeaturedEventSection onRegisterClick={handleRegisterClick} />
      
      {/* Categories */}
      <CategoriesSection />
      
      {/* Registration CTA banner */}
      <section id="register" className="py-20 bg-gradient-to-r from-luxury-black via-luxury-black-obsidian to-luxury-black border-t border-b border-luxury-gray-border/20 text-center px-[48px] md:px-[64px]">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
            PARTICIPATION & ACCESS
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-light text-luxury-white uppercase tracking-wide">
            RESERVE YOUR STAGE ENTRY
          </h2>
          <p className="font-sans text-xs text-[#B8B8B8] max-w-md mx-auto leading-relaxed">
            Fill the dynamic evaluation registration forms to qualify for blind day-wise scoring and live leaderboard listings.
          </p>
          <div className="pt-2">
            <button
              onClick={handleGlobalRegisterCTA}
              className="inline-flex items-center justify-center h-12 px-10 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300"
            >
              REGISTER NOW ↗
            </button>
          </div>
        </div>
      </section>
      
      {/* Past Events */}
      <PastEventsSection />
      
      {/* Winners & Results */}
      <WinnersResultsSection />
      
      {/* Gallery */}
      <GallerySection />
      
      {/* Contact */}
      <ContactSection />
      
      <Footer />

      {/* Dynamic Multi-Step Registration Form Modal */}
      <RegistrationFlow
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        selectedEvent={selectedEvent}
      />
    </div>
  );
}
