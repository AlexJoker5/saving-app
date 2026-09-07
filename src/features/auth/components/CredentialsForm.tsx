import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, signUpSchema, emailSchema } from '../schema/auth.schema';
import { useAuthContext } from '../hooks/useAuthContext';
import { Field } from '../../../components/ui/Field';
import { useFormSave } from '../../../hooks/useFormSave';

type Mode = 'sign-in' | 'sign-up' | 'reset';

export function CredentialsForm({
  mode,
  changeMode,
}: {
  mode: Mode;
  changeMode: (mode: Mode) => void;
}) {
  const auth = useAuthContext();
  const [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(
      mode === 'sign-up'
        ? signUpSchema
        : mode === 'reset'
          ? emailSchema
          : signInSchema,
    ),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const { submit, error } = useFormSave(
    async (values: { email: string; password?: string }) => {
      setMessage('');
      if (mode === 'sign-in') {
        await auth.signIn(values.email, values.password ?? '');
      } else if (mode === 'sign-up') {
        await auth.signUp(values.email, values.password ?? '');
        setMessage(
          'Check your email to confirm your account, then return here to sign in. If you already have an account, sign in or reset your password.',
        );
      } else {
        await auth.resetPassword(values.email);
        setMessage(
          'If this address has an account, a password reset link will arrive shortly.',
        );
      }
      resetField('password');
      resetField('confirmPassword');
    },
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <fieldset disabled={isSubmitting}>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        {mode !== 'reset' && (
          <Field label="Password" error={errors.password?.message}>
            <input
              type="password"
              autoComplete={
                mode === 'sign-in' ? 'current-password' : 'new-password'
              }
              {...register('password')}
            />
          </Field>
        )}
        {mode === 'sign-up' && (
          <Field
            label="Confirm password"
            error={errors.confirmPassword?.message}
          >
            <input
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </Field>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="form-end">
        <button className="button" disabled={isSubmitting}>
          {isSubmitting
            ? 'Please wait…'
            : mode === 'sign-in'
              ? 'Sign in'
              : mode === 'sign-up'
                ? 'Create account'
                : 'Send reset link'}
        </button>
      </div>
      <div className="form-end">
        {mode !== 'sign-in' && (
          <button
            type="button"
            className="button secondary"
            disabled={isSubmitting}
            onClick={() => changeMode('sign-in')}
          >
            Back to sign in
          </button>
        )}
        {mode === 'sign-in' && auth.emailEnabled && (
          <>
            <button
              type="button"
              className="button secondary"
              disabled={isSubmitting}
              onClick={() => changeMode('sign-up')}
            >
              Create account
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={isSubmitting}
              onClick={() => changeMode('reset')}
            >
              Forgot password?
            </button>
          </>
        )}
      </div>
      {!auth.emailEnabled && (
        <p className="notice">
          Sign in with an existing account. New accounts and password reset will
          be available when account email delivery is configured.
        </p>
      )}
    </form>
  );
}
