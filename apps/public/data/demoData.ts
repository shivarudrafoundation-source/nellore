import { Event, Winner } from './types';

export const demoUpcomingEvents: Event[] = [
  {
    id: 'demo-ev-001',
    name: 'Nellore Nerajana',
    code: 'SRF-NLR-2026',
    location: 'Nellore Cultural Hall',
    date: '12 Sep 2026',
    logo: '/brand/logo.png',
    image: '/brand/nellore-nerajana.jpeg',
    description: 'The premier pageant arena celebrating confidence, talent, and grace across pageantry divisions.',
    status: 'upcoming',
    categories: [
      { id: 'cat-k', name: 'Kids', code: 'K' },
      { id: 'cat-t', name: 'Teen', code: 'T' },
      { id: 'cat-m', name: 'Miss', code: 'MS' },
      { id: 'cat-ms', name: 'Ms', code: 'MRS' },
      { id: 'cat-mr', name: 'Mr', code: 'MR' }
    ],
    customFields: [
      { label: 'Instagram Handle', type: 'text', required: false },
      { label: 'Height (cm)', type: 'number', required: true }
    ]
  }
];

export const demoPastEvents: Event[] = [
  {
    id: 'demo-ev-past-001',
    name: 'Nellore Nerajana 2025',
    code: 'NLR25',
    location: 'Nellore Town Center',
    date: '12 Jul 2025',
    logo: '/brand/logo.png',
    image: '/brand/nellore-nerajana.jpeg',
    description: 'Review the leaders and highlights from the Nellore Nerajana 2025 showcase.',
    status: 'past',
    categories: [
      { id: 'cat-past-k', name: 'Kids', code: 'K' },
      { id: 'cat-past-m', name: 'Miss', code: 'MS' },
      { id: 'cat-past-mr', name: 'Mr', code: 'MR' }
    ]
  }
];

export const demoWinners: Record<string, Winner[]> = {
  'demo-ev-past-001': [
    { id: 'w-001', categoryCode: 'MISS', rank: 1, contestantId: 'SRF-NLR25-MS-0007', published: false, finalScore: 92.5 },
    { id: 'w-002', categoryCode: 'MR', rank: 1, contestantId: 'SRF-NLR25-MR-0003', published: false, finalScore: 89.0 },
    { id: 'w-003', categoryCode: 'KIDS', rank: 1, contestantId: 'SRF-NLR25-K-0011', published: false, finalScore: 95.0 }
  ]
};

export const demoPhotos: Record<string, string[]> = {
  'demo-ev-past-001': []
};

export const demoContact = {
  phone: '+91 99999 88888',
  email: 'info@sivarudrafoundations.org',
  location: 'Nellore, Andhra Pradesh, India',
};
