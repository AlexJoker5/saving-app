import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const authConfigured = Boolean(
  url && key?.startsWith('sb_publishable_'),
);
export const authEmailEnabled =
  import.meta.env.VITE_AUTH_EMAIL_ENABLED === 'true';
export const cloudWorkspaceEnabled =
  import.meta.env.VITE_CLOUD_WORKSPACE_ENABLED === 'true';
let client: Promise<SupabaseClient> | undefined;

export function getSupabase() {
  if (!authConfigured || !url || !key) {
    throw new Error('Account sign-in is not configured for this deployment.');
  }
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    }),
  );

  return client;
}
