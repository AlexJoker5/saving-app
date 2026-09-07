import { z } from 'zod';

const email = z.string().trim().pipe(z.email('Enter a valid email address'));
export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
  confirmPassword: z.string(),
});
export const signUpSchema = z
  .object({
    email,
    password: z.string().min(12, 'Use at least 12 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export const emailSchema = z.object({
  email,
  password: z.string(),
  confirmPassword: z.string(),
});
export const newPasswordSchema = z
  .object({
    password: z.string().min(12, 'Use at least 12 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six-digit authenticator code'),
});
