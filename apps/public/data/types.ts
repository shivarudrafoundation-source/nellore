export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface CustomFieldConfig {
  label: string;
  type: 'text' | 'number';
  required: boolean;
}

export interface Event {
  id: string;
  name: string;
  code: string;
  location: string;
  date: string;
  logo: string;
  image?: string;
  description: string;
  status: 'upcoming' | 'active' | 'past';
  categories: Category[];
  customFields?: CustomFieldConfig[];
}

export interface Winner {
  id: string;
  rank: number;
  contestantId: string;
  categoryCode: string;
  imageUrl?: string;
  published: boolean;
  finalScore?: number;
}

export interface EventDetail extends Event {
  winners?: Winner[];
  photos?: string[];
}

export interface ContactConfig {
  phone: string;
  email: string;
  location: string;
  socials: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
}
