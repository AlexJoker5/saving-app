import { DEFAULT_ALLOWED_ORIGINS } from '../const/proxyConfig';
import type { WorkerEnvironment } from '../types/workerTypes';

export function upstreamOrigin(env: WorkerEnvironment): string {
  try {
    const url = new URL(env.SUPABASE_URL?.trim() || '');
    if (
      url.protocol === 'https:' &&
      /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    ) {
      return url.origin;
    }
  } catch {
    /* Report the same actionable message for missing and invalid configuration. */
  }
  throw new Error(
    'Set SUPABASE_URL to your original https://PROJECT_REF.supabase.co origin in Worker Settings.',
  );
}

export function allowedOrigins(env: WorkerEnvironment): Set<string> {
  if (!env.ALLOWED_ORIGINS?.trim()) {
    return new Set(DEFAULT_ALLOWED_ORIGINS);
  }
  const origins = env.ALLOWED_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  try {
    return new Set(
      origins.map((value) => {
        const url = new URL(value);
        const local =
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (
          (!local && url.protocol !== 'https:') ||
          url.username ||
          url.password ||
          url.pathname !== '/' ||
          url.search ||
          url.hash
        ) {
          throw new Error();
        }
        return url.origin;
      }),
    );
  } catch {
    throw new Error(
      'ALLOWED_ORIGINS must contain comma-separated HTTPS origins without paths. Localhost HTTP is supported.',
    );
  }
}

export function allowedCallback(value: string, origins: Set<string>): boolean {
  try {
    const target = new URL(value);

    return (
      !target.username &&
      !target.password &&
      origins.has(target.origin) &&
      target.pathname === '/account'
    );
  } catch {
    return false;
  }
}
