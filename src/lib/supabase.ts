import type { SupabaseClient } from '@supabase/supabase-js';
import { createConnectionRouter } from '../features/connection/lib/createConnectionRouter';
import { supabaseConfig } from './supabaseConfig';

const config = supabaseConfig(
  import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  import.meta.env.VITE_SUPABASE_PROXY_URL?.trim() ?? '',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
  import.meta.env.DEV,
);

export const supabaseConfigurationError = config.error;
export const authConfigured = Boolean(config.url && config.proxy && config.key);
export const connectionRouter =
  config.url && config.proxy && config.key
    ? createConnectionRouter({
        original: config.url,
        proxy: config.proxy,
        key: config.key,
        development: import.meta.env.DEV,
      })
    : null;
export const authEmailEnabled =
  import.meta.env.VITE_AUTH_EMAIL_ENABLED === 'true';
export const cloudWorkspaceEnabled =
  import.meta.env.VITE_CLOUD_WORKSPACE_ENABLED === 'true';
let client: Promise<SupabaseClient> | undefined;

export function getSupabase() {
  if (!connectionRouter || !config.url || !config.key) {
    throw new Error(
      supabaseConfigurationError ||
        'Account sign-in is not configured for this deployment.',
    );
  }
  const router = connectionRouter;
  const { url, key, storageKey } = config;
  client ??= Promise.all([router.initialize(), import('@supabase/supabase-js')])
    .then(([, { createClient }]) =>
      createClient(url, key, {
        auth: {
          storageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'implicit',
        },
        global: { fetch: router.fetch },
      }),
    )
    .catch((error: unknown) => {
      client = undefined;
      throw error;
    });

  return client;
}
