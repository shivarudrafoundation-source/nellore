import { ContactConfig } from './types';

// Production strict data mode: Only display real published database records
export const SHOW_DEMO_DATA = false;

// Default production contact info. If values are empty, the public website hides the corresponding fields dynamically.
export const CONTACT_CONFIG: ContactConfig = {
  phone: '',
  email: '',
  location: '',
  socials: {}
};
