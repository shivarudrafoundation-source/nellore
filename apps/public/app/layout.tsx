import './globals.css';
import React from 'react';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sivarudrafoundation.com'),
  title: {
    default: 'Siva Rudra Foundations | Nellore Nerajana 2026 Official Pageant & Talent Platform',
    template: '%s | Siva Rudra Foundations',
  },
  description:
    'Official platform of Siva Rudra Foundations & Nellore Nerajana 2026. Register for premier state-level pageantry (Kids, Teen, Miss, Ms, Mr), view certified live scores, and celebrate cultural distinction.',
  keywords: [
    'Nellore Nerajana',
    'Nellore Nerajana 2026',
    'Siva Rudra Foundations',
    'Siva Rudra Foundation',
    'Siva Rudra',
    'Nellore Mahotsav',
    'Nellore Pageant',
    'Nellore Beauty Pageant',
    'Miss Nellore',
    'Mr Nellore',
    'Ms Nellore',
    'Kids Pageant Nellore',
    'Teen Pageant Andhra Pradesh',
    'Miss Andhra',
    'Mr Andhra',
    'Nellore Fashion Show',
    'Nellore Talent Contest',
    'Nellore Convention Center Events',
    'Official Results',
    'Certified Scoring Matrix',
    'Siva Rudra Registration',
  ],
  authors: [{ name: 'Siva Rudra Foundations', url: 'https://www.sivarudrafoundation.com' }],
  creator: 'Siva Rudra Foundations',
  publisher: 'Siva Rudra Foundations',
  category: 'Entertainment & Cultural Pageantry',
  classification: 'Pageant & Event Management Platform',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://www.sivarudrafoundation.com',
  },
  openGraph: {
    title: 'Siva Rudra Foundations | Nellore Nerajana 2026 Official Platform',
    description:
      'Official platform of Siva Rudra Foundations & Nellore Nerajana 2026. Certified scoring matrix, talent showcases, live rankings, and event registrations.',
    url: 'https://www.sivarudrafoundation.com',
    siteName: 'Siva Rudra Foundations',
    images: [
      {
        url: '/brand/logo-circle.jpg',
        width: 1200,
        height: 1200,
        alt: 'Siva Rudra Foundations & Nellore Nerajana Official Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Siva Rudra Foundations | Nellore Nerajana 2026 Official Platform',
    description:
      'Official platform of Siva Rudra Foundations & Nellore Nerajana 2026. Certified scoring matrix, talent showcases, live rankings, and event registrations.',
    images: ['/brand/logo-circle.jpg'],
    creator: '@SivaRudraFound',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'google-site-verification-sivarudrafoundation',
  },
  other: {
    'geo.region': 'IN-AP',
    'geo.placename': 'Nellore, Andhra Pradesh, India',
    'geo.position': '14.4426;79.9865',
    'ICBM': '14.4426, 79.9865',
    'rating': 'general',
    'revisit-after': '1 days',
    'language': 'English, Telugu',
  },
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.sivarudrafoundation.com/#organization',
      name: 'Siva Rudra Foundations',
      alternateName: ['Siva Rudra Foundation', 'Nellore Nerajana', 'SRF'],
      url: 'https://www.sivarudrafoundation.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.sivarudrafoundation.com/brand/logo-circle.jpg',
        width: 800,
        height: 800,
      },
      description:
        'Siva Rudra Foundations is a premier cultural and pageantry organization promoting artistic talent, fashion, and social empowerment through transparent, certified merit-based competitions in Nellore and Andhra Pradesh.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Nellore',
        addressRegion: 'Andhra Pradesh',
        addressCountry: 'IN',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.sivarudrafoundation.com/#website',
      url: 'https://www.sivarudrafoundation.com',
      name: 'Siva Rudra Foundations',
      description: 'Official Portal for Nellore Nerajana & Siva Rudra Foundation Pageantry and Cultural Events',
      publisher: {
        '@id': 'https://www.sivarudrafoundation.com/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.sivarudrafoundation.com/results?query={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Event',
      '@id': 'https://www.sivarudrafoundation.com/#event-nellore-nerajana',
      name: 'Nellore Nerajana 2026 - State Pageantry & Talent Championship',
      description:
        'The premier regional cultural and talent pageant featuring Kids, Teen, Miss, Ms, and Mr categories evaluated with a certified blind scoring matrix.',
      url: 'https://www.sivarudrafoundation.com',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Nellore Convention Center',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Nellore',
          addressRegion: 'Andhra Pradesh',
          addressCountry: 'IN',
        },
      },
      organizer: {
        '@id': 'https://www.sivarudrafoundation.com/#organization',
      },
      offers: {
        '@type': 'Offer',
        url: 'https://www.sivarudrafoundation.com',
        price: '0',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        validFrom: '2026-01-01',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://www.sivarudrafoundation.com" />
        <link rel="icon" href="/brand/logo-circle.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/brand/logo-circle.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

