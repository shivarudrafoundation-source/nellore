'use client';

import React, { useState } from 'react';
import { CONTACT_CONFIG, SHOW_DEMO_DATA } from '../data/config';
import { demoContact } from '../data/demoData';

export default function ContactSection() {
  const [emailSent, setEmailSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  // Fallback config logic: If production is empty and SHOW_DEMO_DATA is true, load demo values
  const hasPhone = !!CONTACT_CONFIG.phone;
  const hasEmail = !!CONTACT_CONFIG.email;
  const hasLocation = !!CONTACT_CONFIG.location;

  const phone = hasPhone ? CONTACT_CONFIG.phone : (SHOW_DEMO_DATA ? demoContact.phone : '');
  const email = hasEmail ? CONTACT_CONFIG.email : (SHOW_DEMO_DATA ? demoContact.email : '');
  const location = hasLocation ? CONTACT_CONFIG.location : (SHOW_DEMO_DATA ? demoContact.location : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
      setFormData({ name: '', email: '', message: '' });
    }, 2000);
  };

  return (
    <section id="contact" className="py-16 sm:py-24 bg-[#0A0A0A] text-luxury-white border-t border-luxury-gray-border/20 px-6 sm:px-[48px] md:px-[64px]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title block */}
        <div>
          <span className="font-sans text-[10px] tracking-[0.24em] text-luxury-gold uppercase font-bold block mb-4">
            INQUIRIES & DELEGATION
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide uppercase leading-tight">
            GET IN <span className="text-luxury-gold">TOUCH</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Contact details */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <p className="font-sans text-xs md:text-sm text-[#B8B8B8] leading-relaxed max-w-sm">
              Connect with Siva Rudra Foundations for delegation inquiries, corporate sponsorships, or pageant registrations support.
            </p>

            <div className="space-y-6">
              {phone && (
                <div className="space-y-1">
                  <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/40 uppercase block">Phone Support</span>
                  <a href={`tel:${phone}`} className="font-serif text-lg text-luxury-gold hover:text-luxury-white transition-colors duration-300">
                    {phone}
                  </a>
                </div>
              )}

              {email && (
                <div className="space-y-1">
                  <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/40 uppercase block">Email Address</span>
                  <a href={`mailto:${email}`} className="font-serif text-lg text-luxury-gold hover:text-luxury-white transition-colors duration-300">
                    {email}
                  </a>
                </div>
              )}

              {location && (
                <div className="space-y-1">
                  <span className="font-sans text-[9px] tracking-widest text-[#B8B8B8]/40 uppercase block">Headquarters</span>
                  <p className="font-sans text-xs text-luxury-white">
                    {location}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Premium Contact Form */}
          <div className="lg:col-span-7 border border-luxury-gray-border/20 bg-[#050505] p-6 md:p-10">
            {emailSent ? (
              <div className="text-center py-10 space-y-4">
                <span className="font-serif text-2xl text-luxury-gold uppercase tracking-widest block">MESSAGE SENT</span>
                <p className="font-sans text-xs text-[#B8B8B8]">
                  Thank you. A representative will contact you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] text-[#B8B8B8] uppercase tracking-wider">Your Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="w-full h-11 px-4 bg-[#0A0A0A] border border-luxury-gray-border/40 focus:border-luxury-gold focus:outline-none text-xs" 
                      placeholder="Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] text-[#B8B8B8] uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full h-11 px-4 bg-[#0A0A0A] border border-luxury-gray-border/40 focus:border-luxury-gold focus:outline-none text-xs" 
                      placeholder="name@domain.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[9px] text-[#B8B8B8] uppercase tracking-wider">Your Message</label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                    className="w-full p-4 bg-[#0A0A0A] border border-luxury-gray-border/40 focus:border-luxury-gold focus:outline-none text-xs resize-none" 
                    placeholder="Enter details..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 border border-luxury-gold bg-luxury-gold hover:bg-transparent text-luxury-black-pure hover:text-luxury-gold font-sans text-xs font-semibold tracking-luxury uppercase transition-all duration-300"
                >
                  GET IN TOUCH ↗
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
