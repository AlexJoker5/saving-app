export const DEFAULT_ALLOWED_ORIGINS = [
  'https://saving-app-dusky.vercel.app',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
];

export const FORWARDED_HEADERS = [
  'accept',
  'authorization',
  'apikey',
  'content-type',
  'accept-profile',
  'content-profile',
  'prefer',
  'x-client-info',
  'x-supabase-api-version',
  'x-upsert',
  'cache-control',
  'range',
  'if-none-match',
  'if-modified-since',
];
export const EXPOSED_HEADERS =
  'content-range, content-disposition, etag, retry-after, x-saving-proxy';
export const PREFLIGHT_MAX_AGE = '3600';

export function routeMethods(path: string): string[] {
  if (
    [
      '/auth/v1/token',
      '/auth/v1/logout',
      '/auth/v1/signup',
      '/auth/v1/recover',
      '/auth/v1/resend',
      '/auth/v1/factors',
    ].includes(path)
  ) {
    return ['POST'];
  }
  if (path === '/auth/v1/user') {
    return ['GET', 'PUT'];
  }
  if (path === '/auth/v1/settings') {
    return ['GET'];
  }
  if (path === '/auth/v1/verify') {
    return ['GET', 'POST'];
  }
  if (
    /^\/auth\/v1\/factors\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      path,
    )
  ) {
    return ['DELETE'];
  }
  if (
    /^\/auth\/v1\/factors\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\/(challenge|verify)$/i.test(
      path,
    )
  ) {
    return ['POST'];
  }
  if (path === '/rest/v1/workspaces') {
    return ['GET', 'HEAD', 'POST', 'PATCH'];
  }

  return [];
}
