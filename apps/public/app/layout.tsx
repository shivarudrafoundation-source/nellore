import './globals.css';
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sivarudrafoundation.com'),
  title: {
    default: 'Siva Rudra Foundations | Premier Pageantry & Talent Platform',
    template: '%s | Siva Rudra Foundations',
  },
  description:
    'Official platform of Siva Rudra Foundations. Celebrating poise, talent, and cultural distinction across pageantry categories under strict standards of objective merit.',
  keywords: [
    'Siva Rudra Foundations',
    'Siva Rudra',
    'Pageant',
    'Nellore Nerajana',
    'Nellore Pageant',
    'Kids Pageant',
    'Miss Andhra',
    'Mr Andhra',
    'Talent Platform',
    'Official Results',
    'Certified Scoring Matrix',
  ],
  authors: [{ name: 'Siva Rudra Foundations', url: 'https://www.sivarudrafoundation.com' }],
  creator: 'Siva Rudra Foundations',
  publisher: 'Siva Rudra Foundations',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://www.sivarudrafoundation.com',
  },
  openGraph: {
    title: 'Siva Rudra Foundations | Premier Pageantry & Talent Platform',
    description:
      'Official platform of Siva Rudra Foundations. Certified scoring matrix, talent showcases, live rankings, and event registrations.',
    url: 'https://www.sivarudrafoundation.com',
    siteName: 'Siva Rudra Foundations',
    images: [
      {
        url: '/brand/logo-circle.jpg',
        width: 800,
        height: 800,
        alt: 'Siva Rudra Foundations Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Siva Rudra Foundations | Premier Pageantry & Talent Platform',
    description:
      'Official platform of Siva Rudra Foundations. Certified scoring matrix, talent showcases, live rankings, and event registrations.',
    images: ['/brand/logo-circle.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
