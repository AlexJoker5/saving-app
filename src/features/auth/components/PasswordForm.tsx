import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newPasswordSchema } from '../schema/auth.schema';
import { Field } from '../../../components/ui/Field';
import { useFormSave } from '../../../hooks/useFormSave';

export function PasswordForm({
  save,
  onBusyChange,
}: {
  save: (password: string) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const { submit, error } = useFormSave(
    async ({ password }: { password: string }) => {
      onBusyChange?.(true);
      try {
        await save(password);
      } finally {
        onBusyChange?.(false);
      }
    },
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={isSubmitting}>
        <Field label="New password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        <Field
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        </Field>
      </fieldset>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <button className="button" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}
