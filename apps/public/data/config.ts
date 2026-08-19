import { ContactConfig } from './types';

// Dev switch: Toggle to false to test strict production empty states
export const SHOW_DEMO_DATA = true;

// Default production contact info. If values are empty, the public website hides the corresponding fields dynamically.
export const CONTACT_CONFIG: ContactConfig = {
  phone: '',
  email: '',
  location: '',
  socials: {}
};
