export interface PublicEventCategoryDto {
  id: string;
  name: string;
  code: string;
  description: string | null;
  customFields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
}

export type RegistrationAvailabilityStatus = 'OPEN' | 'NOT_YET_OPEN' | 'CLOSED' | 'CANCELLED';

export interface PublicEventSummaryDto {
  id: string;
  name: string;
  code: string;
  location: string;
  startDate: string;
  endDate: string;
  logoUrl: string | null;
  description: string;
  registrationOpenDate: string | null;
  registrationCloseDate: string | null;
  status: string;
  registrationStatus: RegistrationAvailabilityStatus;
  isRegistrationOpen: boolean;
  categories: PublicEventCategoryDto[];
}

export interface PublicRegistrationPayload {
  eventId: string;
  categoryId: string;
  otp?: string;
  verificationToken?: string;
  baseFields: {
    name: string;
    mobile: string;
    location: string;
    gender: string;
    email?: string;
    age: number | string;
    dob: string;
  };
  customFields?: Record<string, any>;
  idempotencyKey?: string;
}

export interface PublicRegistrationConfirmationDto {
  id: string;
  referenceNumber: string;
  eventId: string;
  eventName: string;
  categoryId: string;
  categoryName: string;
  applicantName: string;
  mobile: string;
  paymentStatus: 'UNPAID';
  status: 'REGISTRATION_RECEIVED';
  message: string;
  createdAt: string;
}
