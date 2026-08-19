import { z } from 'zod';

export const CustomFieldSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['text', 'number', 'boolean']),
  required: z.boolean(),
});

export const SubCriterionSchema = z.object({
  name: z.string().min(1, 'Criterion name is required'),
  maxMarks: z.number().positive('Max marks must be greater than 0'),
});

export const RoundConfigSchema = z.object({
  name: z.string().min(1, 'Round name is required'),
  maxMarks: z.number().positive('Max marks must be greater than 0'),
  scoredBy: z.enum(['admin', 'judge']),
  day: z.number().int().positive('Day must be 1 or higher'),
  subCriteria: z.array(SubCriterionSchema).optional(),
});

export const EventCreationSchema = z.object({
  name: z.string().min(2, 'Event name must be at least 2 characters'),
  code: z.string().min(2, 'Event code must be at least 2 characters').max(10, 'Event code must be 10 characters or less'),
  location: z.string().min(2, 'Location is required'),
  dates: z.string().min(2, 'Dates description is required'),
  logo: z.string().url('Logo must be a valid URL').nullable().optional(),
  description: z.string().min(5, 'Description is required'),
  categories: z.array(z.string().min(1, 'Category name cannot be empty')).min(1, 'At least one category is required'),
  baseFields: z.array(z.string()).min(1, 'Base fields are required'),
  customFields: z.array(CustomFieldSchema).optional(),
  rounds: z.array(RoundConfigSchema).min(1, 'At least one round is required'),
});

export const RegistrationSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  baseFields: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number, must be 10 digits starting with 6-9'),
    location: z.string().min(2, 'Location must be at least 2 characters'),
    gender: z.enum(['Male', 'Female', 'Other']),
    email: z.string().email('Invalid email address'),
    age: z.number().min(1, 'Age must be positive').max(120, 'Invalid age'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be in YYYY-MM-DD format'),
  }),
  customFields: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const JudgeLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const ContestantLoginSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number, must be 10 digits starting with 6-9'),
});

export const OTPVerificationSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const ScoreSubmissionSchema = z.object({
  contestantId: z.string().min(1, 'Contestant ID is required'),
  roundId: z.string().uuid('Invalid round ID'),
  judgeId: z.string().uuid('Invalid judge ID').nullable(), // null for admin submissions
  subScores: z.record(z.number().min(0, 'Score cannot be negative')),
  value: z.number().min(0, 'Total score value cannot be negative'),
});
