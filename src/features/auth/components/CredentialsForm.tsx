import { Link, useNavigate } from 'react-router';
import { routePaths } from '../../../routes/routePaths';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, signUpSchema, emailSchema } from '../schema/auth.schema';
import { useAuthContext } from '../hooks/useAuthContext';
import { Field } from '../../../components/ui/Field';
import { useFormSave } from '../../../hooks/useFormSave';

type Mode = 'sign-in' | 'sign-up' | 'reset';

export function CredentialsForm({ mode }: { mode: Mode }) {
  const auth = useAuthContext();
  const navigate = useNavigate();
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
      if (mode === 'sign-in') {
        await auth.signIn(values.email, values.password ?? '');
      } else if (mode === 'sign-up') {
        await auth.signUp(values.email, values.password ?? '');
        navigate(routePaths.confirmEmail);
      } else {
        await auth.resetPassword(values.email);
        navigate(routePaths.resetEmailSent);
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
      <div className="form-end">
        <button
          className="button"
          disabled={isSubmitting || (mode !== 'sign-in' && !auth.emailEnabled)}
        >
          {isSubmitting
            ? 'Please wait…'
            : mode === 'sign-in'
              ? 'Sign in'
              : mode === 'sign-up'
                ? 'Create account'
                : 'Send reset link'}
        </button>
      </div>
      {!isSubmitting && (
        <div className="form-end">
          {mode !== 'sign-in' && (
            <Link className="button secondary" to={routePaths.login}>
              Back to sign in
            </Link>
          )}
          {mode === 'sign-in' && auth.emailEnabled && (
            <>
              <Link className="button secondary" to={routePaths.signup}>
                Create account
              </Link>
              <Link className="button secondary" to={routePaths.forgotPassword}>
                Forgot password?
              </Link>
            </>
          )}
        </div>
      )}
      {!auth.emailEnabled && (
        <p className="notice">
          Sign in with an existing account. New accounts and password reset will
          be available when account email delivery is configured.
        </p>
      )}
    </form>
  );
}
