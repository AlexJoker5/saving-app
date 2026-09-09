import { useCallback, useEffect, useRef, useState } from 'react';
import {
  authConfigured,
  authEmailEnabled,
  getSupabase,
} from '../../../lib/supabase';
import type { AuthContextValue, AuthState } from '../types/auth.type';

const emptyState: AuthState = {
  phase: authConfigured ? 'loading' : 'disabled',
  user: null,
  factors: [],
  recovery: false,
  error: '',
};
const recoveryKey = 'saving.auth.recovery';

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>(emptyState);
  const generation = useRef(0);
  const mounted = useRef(false);
  const recovery = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    const current = () => mounted.current && request === generation.current;
    try {
      const client = await getSupabase();
      const session = await client.auth.getSession();
      if (session.error) {
        throw session.error;
      }
      if (!session.data.session) {
        if (current()) {
          setState({ ...emptyState, phase: 'signed-out' });
        }

        return;
      }
      const result = await client.auth.getUser();
      if (result.error) {
        throw result.error;
      }
      const [assurance, factors] = await Promise.all([
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
        client.auth.mfa.listFactors(),
      ]);
      if (assurance.error) {
        throw assurance.error;
      }
      if (factors.error) {
        throw factors.error;
      }
      const needsMfa =
        assurance.data.currentLevel !== 'aal2' &&
        (assurance.data.nextLevel === 'aal2' ||
          factors.data.all.some((factor) => factor.status === 'verified'));
      if (current()) {
        setState({
          phase: needsMfa ? 'mfa-required' : 'signed-in',
          user: {
            id: result.data.user.id,
            email: result.data.user.email ?? '',
          },
          factors: factors.data.all
            .filter((factor) => factor.factor_type === 'totp')
            .map((factor) => ({
              id: factor.id,
              name: factor.friendly_name || 'Authenticator',
              verified: factor.status === 'verified',
            })),
          recovery: recovery.current,
          error: '',
        });
      }
    } catch (error) {
      if (current()) {
        setState((previous) => ({
          ...previous,
          phase: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Could not check your account. Please retry.',
        }));
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!authConfigured) {
      return;
    }
    mounted.current = true;
    const requests = generation;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      recovery.current =
        sessionStorage.getItem(recoveryKey) === 'true' ||
        new URLSearchParams(window.location.hash.slice(1)).get('type') ===
          'recovery';
      if (recovery.current) {
        sessionStorage.setItem(recoveryKey, 'true');
      }
    } catch {
      /* Storage may be unavailable. */
    }
    void getSupabase()
      .then((client) => {
        if (!active) {
          return;
        }
        const { data } = client.auth.onAuthStateChange((event, session) => {
          if (!active) {
            return;
          }
          if (event === 'PASSWORD_RECOVERY') {
            recovery.current = true;
            try {
              sessionStorage.setItem(recoveryKey, 'true');
            } catch {
              /* Keep the recovery state in memory. */
            }
          }
          if (!session) {
            generation.current++;
            recovery.current = false;
            try {
              sessionStorage.removeItem(recoveryKey);
            } catch {
              /* No workspace data is touched. */
            }
            setState({ ...emptyState, phase: 'signed-out' });

            return;
          }
          if (event === 'PASSWORD_RECOVERY') {
            setState((previous) => ({
              ...previous,
              phase: 'loading',
              recovery: true,
            }));
          }
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            setState((previous) =>
              previous.user?.id === session.user.id
                ? previous
                : { ...emptyState, phase: 'loading' },
            );
          }
          // Run SDK requests outside the auth callback's session lock.
          clearTimeout(timer);
          timer = setTimeout(() => {
            void refresh().catch(() => undefined);
          }, 0);
        });
        unsubscribe = () => data.subscription.unsubscribe();
        void refresh().catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            ...emptyState,
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Could not initialize sign-in.',
          });
        }
      });

    return () => {
      active = false;
      mounted.current = false;
      requests.current++;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [refresh]);

  // Existing emails and Supabase allow-list use /account. Route guards dispatch
  // the verified session to its dedicated verification/setup/reset page.
  const redirectTo = () => new URL('/account', window.location.origin).href;
  const requireEmail = () => {
    if (!authEmailEnabled) {
      throw new Error('Account email delivery is not configured yet.');
    }
  };

  return {
    ...state,
    emailEnabled: authEmailEnabled,
    refresh,
    signIn: async (email, password) => {
      const client = await getSupabase();
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      await refresh();
    },
    signUp: async (email, password) => {
      requireEmail();
      const client = await getSupabase();
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) {
        throw error;
      }
      await refresh();
    },
    signOut: async () => {
      const client = await getSupabase();
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) {
        throw error;
      }
      await refresh();
    },
    resetPassword: async (email) => {
      requireEmail();
      const client = await getSupabase();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo(),
      });
      if (error) {
        throw error;
      }
    },
    updatePassword: async (password) => {
      const client = await getSupabase();
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      recovery.current = false;
      try {
        sessionStorage.removeItem(recoveryKey);
      } catch {
        /* Keep the in-memory state. */
      }
      await refresh();
    },
    enroll: async () => {
      const client = await getSupabase();
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Saving authenticator ' + new Date().toISOString(),
        issuer: 'Saving',
      });
      if (error) {
        throw error;
      }

      // Keep unfinished setups visible if the user leaves this route or reloads.
      await refresh();

      return {
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };
    },
    verify: async (factorId, code) => {
      const client = await getSupabase();
      const { error } = await client.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) {
        throw error;
      }
      await refresh();
    },
    removeFactor: async (factorId) => {
      const client = await getSupabase();
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) {
        throw factors.error;
      }
      const verified = factors.data.totp.filter(
        (factor) => factor.status === 'verified',
      );
      if (
        verified.length <= 1 &&
        verified.some((factor) => factor.id === factorId)
      ) {
        throw new Error(
          'Add and verify a backup authenticator before removing your last one.',
        );
      }
      const { error } = await client.auth.mfa.unenroll({ factorId });
      if (error) {
        throw error;
      }
      const updated = await client.auth.refreshSession();
      if (updated.error) {
        throw updated.error;
      }
      await refresh();
    },
  };
}
