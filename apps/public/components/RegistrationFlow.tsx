'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PublicEvent } from './UpcomingEventsSection';
import { getApiBaseUrl } from '@srf/ui';

interface RegistrationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: PublicEvent | null;
}

export default function RegistrationFlow({ isOpen, onClose, selectedEvent }: RegistrationFlowProps) {
  const API = getApiBaseUrl();
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  
  // Base fields
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    location: '',
    gender: 'FEMALE',
    email: '',
    age: '',
    dob: '',
  });

  // Dynamic custom fields
  const [customData, setCustomData] = useState<Record<string, string>>({
    height: '',
    instagram: '',
    experience: 'None / Beginner',
    profession: '',
    emergencyContact: '',
  });

  // OTP State
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth state and prefill profile
  useEffect(() => {
    if (isOpen) {
      fetch(`${API}/auth/user/profile`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.user) {
            setCurrentUser(data.user);
            setFormData((prev) => ({
              ...prev,
              name: prev.name || data.user.name || '',
              email: prev.email || data.user.email || '',
              mobile: prev.mobile || data.user.mobile || '',
              location: prev.location || data.user.location || '',
            }));
            setOtpVerified(true);
          } else {
            setCurrentUser(null);
          }
          setAuthChecked(true);
        })
        .catch(() => {
          setCurrentUser(null);
          setAuthChecked(true);
        });
    }
  }, [isOpen]);

  // OTP Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpTimer]);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (selectedEvent) {
      setEvent(selectedEvent);
      if (selectedEvent.categories && selectedEvent.categories.length > 0) {
        setCategoryId(selectedEvent.categories[0].id);
      }
      // Reset flow
      setStep(1);
      setOtp('');
      setOtpSent(false);
      setOtpVerified(false);
      setOtpError('');
      setOtpTimer(0);
      setSubmissionResult(null);
      setErrors({});
    }
  }, [selectedEvent]);

  if (!isOpen || !event) return null;

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      if (!categoryId) nextErrors.category = 'Please select a pageant category';
    }

    if (step === 2) {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        nextErrors.name = 'Full name (minimum 2 characters) is required';
      }
      const cleanMobile = formData.mobile.replace(/\D/g, '');
      if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
        nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210)';
      }
      if (!formData.location.trim()) nextErrors.location = 'Location / City is required';
      if (!formData.gender) nextErrors.gender = 'Gender is required';
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        nextErrors.email = 'Valid email address is required for verification';
      }
      if (!formData.age.trim() || isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
        nextErrors.age = 'Enter a valid numerical age';
      }
      if (!formData.dob) {
        nextErrors.dob = 'Date of Birth is required';
      } else {
        const parsedDob = new Date(formData.dob);
        if (parsedDob > new Date()) {
          nextErrors.dob = 'Date of Birth cannot be in the future';
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Request OTP from Backend API via Email
  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    setOtpSuccessMsg('');
    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const res = await fetch(`${API}/public/registrations/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          eventId: event.id,
          categoryId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to request verification code.');
      }

      setOtpSent(true);
      setOtpTimer(60);
      setOtpSuccessMsg(`Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP via Backend API via Email
  const handleVerifyOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      if (!/^\d{6}$/.test(cleanOtp)) {
        throw new Error('Please enter the 6-digit verification code.');
      }

      const res = await fetch(`${API}/public/registrations/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          eventId: event.id,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid or expired verification code.');
      }

      setOtpVerified(true);
      setOtpSuccessMsg('Email address verified successfully.');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Final Registration Submission
  const handleSubmitRegistration = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      const cleanMobile = formData.mobile.replace(/\D/g, '');
      const cleanOtp = otp.trim();

      const payload = {
        eventId: event.id,
        categoryId,
        otp: cleanOtp,
        baseFields: {
          name: formData.name.trim(),
          mobile: cleanMobile,
          location: formData.location.trim(),
          gender: formData.gender,
          email: formData.email.trim() || undefined,
          age: Number(formData.age),
          dob: formData.dob,
        },
        customFields: customData,
      };

      const res = await fetch(`${API}/public/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit registration.');
      }

      setSubmissionResult(data);
      setStep(5); // Confirmation Screen
    } catch (err: any) {
      setErrors({ form: err.message || 'Unable to submit registration. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = event.categories?.find((c) => c.id === categoryId);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0A0A0A] border border-luxury-gold/40 w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 md:p-10 text-luxury-white space-y-6 sm:space-y-8 shadow-[0_0_50px_rgba(212,175,55,0.1)] relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 min-w-[44px] min-h-[44px] flex items-center justify-center text-luxury-white/40 hover:text-white text-xl font-sans"
          aria-label="Close registration modal"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="border-b border-luxury-gray-border/20 pb-4 space-y-1 pr-10">
          <span className="font-sans text-[9px] tracking-[0.24em] text-luxury-gold uppercase font-bold block">
            OFFICIAL STAGE ENTRY REGISTRATION
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-light tracking-wide uppercase">
            {event.name}
          </h2>
        </div>

        {/* AUTHENTICATION GATE */}
        {authChecked && !currentUser && (
          <div className="space-y-6 text-center py-6">
            <div className="w-12 h-12 rounded-full border border-luxury-gold/50 bg-luxury-gold/10 mx-auto flex items-center justify-center text-luxury-gold text-lg font-serif">
              🔒
            </div>
            <div className="space-y-2">
              <span className="font-sans text-[10px] tracking-[0.24em] text-[#D4AF37] uppercase font-bold block">
                AUTHENTICATION REQUIRED
              </span>
              <h3 className="font-serif text-2xl font-light text-white">
                Sign In to Register
              </h3>
              <p className="font-sans text-xs text-white/60 max-w-md mx-auto leading-relaxed">
                You must be logged in to your website account before registering for <strong>{event.name}</strong>. This ensures all registrations, payment verifications, and Contestant IDs are securely linked to your profile.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-sm mx-auto">
              <a
                href={`/login?returnUrl=${encodeURIComponent(`/events/${event.code || event.id}`)}`}
                className="flex-1 py-3 px-5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs uppercase tracking-wider transition-colors text-center rounded-sm"
              >
                SIGN IN →
              </a>
              <a
                href={`/signup?returnUrl=${encodeURIComponent(`/events/${event.code || event.id}`)}`}
                className="flex-1 py-3 px-5 border border-white/20 hover:border-[#D4AF37] text-white font-semibold text-xs uppercase tracking-wider transition-colors text-center rounded-sm"
              >
                CREATE ACCOUNT
              </a>
            </div>
          </div>
        )}

        {/* Step Progress Indicators */}
        {currentUser && (
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 border-b border-luxury-gray-border/10 pb-4">
          {[
            { n: 1, label: 'CATEGORY' },
            { n: 2, label: 'DETAILS' },
            { n: 3, label: 'PROFILE' },
            { n: 4, label: 'VERIFY' },
            { n: 5, label: 'CONFIRM' },
          ].map((s) => (
            <div key={s.n} className="text-center space-y-1">
              <div
                className={`h-1 w-full transition-colors duration-300 ${
                  step >= s.n ? 'bg-luxury-gold' : 'bg-luxury-gray-border/20'
                }`}
              />
              <span
                className={`font-sans text-[7px] sm:text-[8px] tracking-wider sm:tracking-widest uppercase block truncate ${
                  step === s.n ? 'text-luxury-gold font-bold' : 'text-luxury-white/30'
                }`}
              >
                0{s.n} {s.label}
              </span>
            </div>
          ))}
        </div>
        )}

        {/* STEP 1: CATEGORY SELECTION */}
        {currentUser && step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg font-light text-luxury-white">Select Pageant Division</h3>
              <p className="font-sans text-xs text-luxury-white/40">
                Choose the official competitive category you wish to participate in.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {event.categories && event.categories.length > 0 ? (
                event.categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-5 border cursor-pointer transition-all duration-300 min-h-[44px] ${
                      categoryId === cat.id
                        ? 'border-luxury-gold bg-luxury-gold/10'
                        : 'border-luxury-gray-border/30 bg-[#050505] hover:border-luxury-gold/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-serif text-base text-luxury-white font-medium">{cat.name}</span>
                      <span className="font-sans text-[9px] tracking-widest px-2 py-0.5 border border-luxury-gold/30 text-luxury-gold uppercase">
                        {cat.code}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-luxury-white/50 leading-relaxed">
                      {cat.description || 'Official stage division for Nellore Nerajana pageant.'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="font-sans text-xs text-luxury-white/40">No categories found.</p>
              )}
            </div>

            {errors.category && <p className="font-sans text-xs text-red-400">{errors.category}</p>}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleNext}
                className="min-h-[44px] h-11 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300"
              >
                PROCEED TO DETAILS →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: APPLICANT BASE DETAILS */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg font-light text-luxury-white">Applicant Personal Details</h3>
              <p className="font-sans text-xs text-luxury-white/40">
                Division Selected: <span className="text-luxury-gold font-bold">{selectedCategoryObj?.name}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
                {errors.name && <p className="font-sans text-[10px] text-red-400">{errors.name}</p>}
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
                {errors.mobile && <p className="font-sans text-[10px] text-red-400">{errors.mobile}</p>}
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Email Address (For Verification) *
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="youremail@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
                {errors.email && <p className="font-sans text-[10px] text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Location / City *
                </label>
                <input
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Nellore, Andhra Pradesh"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
                {errors.location && <p className="font-sans text-[10px] text-red-400">{errors.location}</p>}
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => {
                      if (val) {
                        const birthYear = new Date(val).getFullYear();
                        const currentYear = new Date().getFullYear();
                        const approxAge = Math.max(1, currentYear - birthYear);
                        return { ...prev, dob: val, age: String(approxAge) };
                      }
                      return { ...prev, dob: val };
                    });
                  }}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
                {errors.dob && <p className="font-sans text-[10px] text-red-400">{errors.dob}</p>}
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Age *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Age in years"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
                {errors.age && <p className="font-sans text-[10px] text-red-400">{errors.age}</p>}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-luxury-gray-border/10">
              <button
                onClick={handleBack}
                className="min-h-[44px] h-11 px-6 border border-luxury-gray-border/40 text-luxury-white/70 font-sans text-xs uppercase tracking-luxury hover:border-luxury-gold"
              >
                ← BACK
              </button>
              <button
                onClick={handleNext}
                className="min-h-[44px] h-11 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300"
              >
                NEXT: PROFILE DETAILS →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CUSTOM PROFILE FIELDS */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg font-light text-luxury-white">Category Profile & Experience</h3>
              <p className="font-sans text-xs text-luxury-white/40">
                Optional profile metrics to assist judge orientation and staging.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Height (e.g. 5 ft 8 in)
                </label>
                <input
                  type="text"
                  placeholder="5 ft 7 in"
                  value={customData.height}
                  onChange={(e) => setCustomData({ ...customData, height: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  placeholder="@your_profile_handle"
                  value={customData.instagram}
                  onChange={(e) => setCustomData({ ...customData, instagram: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Prior Pageant / Modeling Experience
                </label>
                <select
                  value={customData.experience}
                  onChange={(e) => setCustomData({ ...customData, experience: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                >
                  <option value="None / Beginner">None / Beginner</option>
                  <option value="1-2 Local Shows">1-2 Local Shows</option>
                  <option value="State / National Level">State / National Level</option>
                  <option value="Professional Model">Professional Model</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Profession / Education
                </label>
                <input
                  type="text"
                  placeholder="Student / Working Professional"
                  value={customData.profession}
                  onChange={(e) => setCustomData({ ...customData, profession: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase">
                  Emergency Contact Name & Phone
                </label>
                <input
                  type="text"
                  placeholder="Parent / Guardian Name (9876543210)"
                  value={customData.emergencyContact}
                  onChange={(e) => setCustomData({ ...customData, emergencyContact: e.target.value })}
                  className="w-full min-h-[44px] h-11 bg-[#050505] border border-luxury-gray-border/30 px-3 font-sans text-xs text-luxury-white outline-none focus:border-luxury-gold"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-luxury-gray-border/10">
              <button
                onClick={handleBack}
                className="min-h-[44px] h-11 px-6 border border-luxury-gray-border/40 text-luxury-white/70 font-sans text-xs uppercase tracking-luxury hover:border-luxury-gold"
              >
                ← BACK
              </button>
              <button
                onClick={handleNext}
                className="min-h-[44px] h-11 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300"
              >
                {otpVerified ? 'REVIEW & SUBMIT →' : 'NEXT: EMAIL OTP VERIFY →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: EMAIL OTP VERIFICATION */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-lg font-light text-luxury-white">Email Address Verification</h3>
              <p className="font-sans text-xs text-luxury-white/40">
                To verify your registration, a 6-digit verification code will be sent to your email{' '}
                <span className="text-luxury-gold font-mono font-bold">{formData.email}</span>
              </p>
            </div>

            <div className="p-4 sm:p-6 bg-[#050505] border border-luxury-gray-border/30 space-y-4">
              {!otpSent ? (
                <div className="text-center space-y-4 py-4">
                  <span className="font-sans text-xs text-luxury-white/60 block">
                    Click below to receive a 6-digit verification code in your email inbox.
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpLoading}
                    className="min-h-[44px] h-11 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300 disabled:opacity-50"
                  >
                    {otpLoading ? 'DISPATCHING CODE...' : 'SEND EMAIL VERIFICATION CODE ↗'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {otpSuccessMsg && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 font-sans text-xs">
                      {otpSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="font-sans text-[10px] tracking-luxury text-luxury-white/60 uppercase block">
                      Enter 6-Digit Email Code
                    </label>
                    <div className="flex flex-wrap gap-3 items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="h-11 w-44 sm:w-48 bg-black border border-luxury-gray-border/40 px-3 font-mono text-lg tracking-widest text-center text-luxury-gold outline-none focus:border-luxury-gold"
                      />
                      {!otpVerified && (
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading || otp.length !== 6}
                          className="min-h-[44px] h-11 px-6 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold uppercase tracking-luxury hover:bg-transparent hover:text-luxury-gold transition-all duration-300 disabled:opacity-40"
                        >
                          {otpLoading ? 'VERIFYING...' : 'VERIFY CODE'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-sans text-luxury-white/40 pt-1">
                    <span>Did not receive code? Check spam folder or</span>
                    {otpTimer > 0 ? (
                      <span className="text-luxury-gold/60 uppercase tracking-wider font-mono">
                        RESEND IN {otpTimer}S
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={otpLoading}
                        className="text-luxury-gold hover:underline uppercase tracking-wider min-h-[44px] inline-flex items-center"
                      >
                        RESEND EMAIL OTP
                      </button>
                    )}
                  </div>
                </div>
              )}

              {otpError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs">
                  {otpError}
                </div>
              )}

              {errors.form && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs">
                  {errors.form}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-luxury-gray-border/10">
              <button
                onClick={handleBack}
                className="min-h-[44px] h-11 px-6 border border-luxury-gray-border/40 text-luxury-white/70 font-sans text-xs uppercase tracking-luxury hover:border-luxury-gold"
              >
                ← BACK
              </button>
              <button
                onClick={handleSubmitRegistration}
                disabled={isSubmitting || !otpVerified}
                className="min-h-[44px] h-11 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-transparent hover:text-luxury-gold transition-all duration-300 disabled:opacity-40"
              >
                {isSubmitting ? 'SUBMITTING...' : 'COMPLETE REGISTRATION ↗'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: REGISTRATION CONFIRMATION */}
        {step === 5 && submissionResult && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full border-2 border-luxury-gold bg-luxury-gold/10 mx-auto flex items-center justify-center text-luxury-gold text-2xl font-serif">
              ✓
            </div>

            <div className="space-y-2">
              <span className="font-sans text-[10px] tracking-[0.24em] text-green-400 uppercase font-bold block">
                REGISTRATION RECEIVED
              </span>
              <h3 className="font-serif text-2xl font-light text-luxury-white">
                {submissionResult.applicantName}
              </h3>
              <p className="font-sans text-xs text-luxury-white/60 max-w-md mx-auto leading-relaxed">
                Your registration has been received. Contestant account activation will be completed by the Admin after payment verification.
              </p>
            </div>

            {/* Reference Ledger Card */}
            <div className="p-5 sm:p-6 bg-[#050505] border border-luxury-gold/30 text-left space-y-3 max-w-md mx-auto">
              <div className="flex justify-between text-xs font-sans">
                <span className="text-luxury-white/40 uppercase">Reference Number:</span>
                <span className="font-mono text-luxury-gold font-bold">{submissionResult.referenceNumber}</span>
              </div>
              <div className="flex justify-between text-xs font-sans">
                <span className="text-luxury-white/40 uppercase">Event:</span>
                <span className="text-luxury-white font-medium">{submissionResult.eventName}</span>
              </div>
              <div className="flex justify-between text-xs font-sans">
                <span className="text-luxury-white/40 uppercase">Division:</span>
                <span className="text-luxury-gold font-medium">{submissionResult.categoryName}</span>
              </div>
              <div className="flex justify-between text-xs font-sans">
                <span className="text-luxury-white/40 uppercase">Registered Mobile:</span>
                <span className="font-mono text-luxury-white font-medium">+91 {submissionResult.mobile}</span>
              </div>
              <div className="flex justify-between text-xs font-sans items-center pt-2 border-t border-luxury-gray-border/10">
                <span className="text-luxury-white/40 uppercase">Payment Status:</span>
                <span className="font-sans text-[9px] tracking-widest uppercase font-bold text-yellow-500 border border-yellow-500/30 px-2 py-0.5 bg-yellow-500/5">
                  PAYMENT PENDING
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/profile"
                className="min-h-[44px] h-11 px-8 border border-luxury-gold bg-luxury-gold text-luxury-black-pure font-sans text-xs font-semibold tracking-luxury uppercase hover:bg-[#E5C158] transition-all duration-300 inline-flex items-center justify-center"
              >
                VIEW IN MY EVENTS & STATUS →
              </a>
              <button
                onClick={onClose}
                className="min-h-[44px] h-11 px-6 border border-white/20 text-white/70 font-sans text-xs uppercase tracking-luxury hover:text-white transition-all duration-300"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
