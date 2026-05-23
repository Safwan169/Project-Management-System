import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Full name is required').max(80, 'Name is too long'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['admin', 'manager', 'member']),
  })
  // Cross-field check — surfaced on the confirmPassword field.
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const projectSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120, 'Title is too long'),
    client: z.string().min(1, 'Client is required'),
    description: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    // The number input yields a string; kept as a string here and coerced
    // to a number on submit. Empty means "no budget".
    budget: z
      .string()
      .optional()
      .refine((v) => !v || Number(v) >= 0, 'Budget cannot be negative'),
    status: z.enum(['planned', 'active', 'completed', 'archived']),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });

export const sprintSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120, 'Title is too long'),
    goal: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProjectValues = z.infer<typeof projectSchema>;
export type SprintValues = z.infer<typeof sprintSchema>;
