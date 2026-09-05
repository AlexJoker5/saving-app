import { z } from 'zod';

export const moneySchema = z
  .number()
  .int('Use a whole MMK amount')
  .min(0)
  .max(1_000_000_000_000);
export const monthSchema = z
  .string()
  .regex(/^(20\d{2})-(0[1-9]|1[0-2])$/, 'Choose a month from 2000–2099');
export const dateSchema = z
  .string()
  .regex(/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/, 'Choose a valid date')
  .refine((value) => {
    const date = new Date(value + 'T00:00:00Z');

    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Choose a valid date');
