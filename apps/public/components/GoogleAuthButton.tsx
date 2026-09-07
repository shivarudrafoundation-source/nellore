'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@srf/ui';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleAuthButtonProps {
  returnUrl?: string;
  onError?: (err: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  label?: string;
}

export default function GoogleAuthButton({
  returnUrl = '/profile',
  onError,
  text = 'continue_with',
  label = 'Continue with Google',
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const API_BASE = getApiBaseUrl();
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '667486999600-digfcoihdvpc0r8b3jgbn6hbm2emairn.apps.googleusercontent.com';

  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      onError?.('Google authentication failed. No credential received.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/user/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to authenticate with Google.');
      }

      if (data.tokens?.accessToken) {
        localStorage.setItem('srf_token', data.tokens.accessToken);
      }

      router.push(returnUrl);
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        onError?.('Server is connecting. Please wait a moment and try signing in with Google again.');
      } else {
        onError?.(err.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load Google Identity Services Script
    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            text: text,
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          });
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGoogle();
      };
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, [googleClientId, text]);

  const handleCustomClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      onError?.('Google Sign-In is initializing. Please click again in a few seconds.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-3">
      {/* Hidden container where official Google button renders */}
      <div ref={buttonRef} className="w-full flex justify-center [&>div]:!w-full [&>iframe]:!w-full min-h-[44px]">
        {/* Fallback button shown while Google GSI loads */}
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#111111] hover:bg-[#1a1a1a] text-white border border-[#D4AF37]/40 hover:border-[#D4AF37] px-4 py-2.5 rounded-sm font-sans text-xs tracking-wider uppercase transition-all duration-200 shadow-md active:scale-[0.99] disabled:opacity-50"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'Authenticating...' : label}</span>
        </button>
      </div>
    </div>
  );
}
