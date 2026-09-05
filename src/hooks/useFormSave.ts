import { useState } from 'react';
import type { Save } from '../lib/form-types';

export function useFormSave<T>(save: Save<T>) {
  const [error, setError] = useState('');

  return {
    error,
    submit: async (value: T) => {
      setError('');
      try {
        await save(value);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Could not save. Please try again.',
        );
      }
    },
  };
}
