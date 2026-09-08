import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { codeSchema } from '../schema/auth.schema';
import { Field } from '../../../components/ui/Field';
import { useFormSave } from '../../../hooks/useFormSave';

export function AuthenticatorForm({
  verify,
  cancel,
  label = 'Verify and continue',
  onBusyChange,
}: {
  verify: (code: string) => Promise<void>;
  cancel?: () => void;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });
  const { submit, error } = useFormSave(async ({ code }: { code: string }) => {
    onBusyChange?.(true);
    try {
      await verify(code);
    } finally {
      onBusyChange?.(false);
    }
  });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Field label="Authenticator code" error={errors.code?.message}>
        <input
          className="auth-code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          {...register('code')}
          disabled={isSubmitting}
        />
      </Field>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <div className="form-end">
        {cancel && (
          <button
            type="button"
            className="button secondary"
            disabled={isSubmitting}
            onClick={cancel}
          >
            Cancel
          </button>
        )}
        <button className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying…' : label}
        </button>
      </div>
    </form>
  );
}
