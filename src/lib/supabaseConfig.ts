function apiOrigin(value: string, allowLocal: boolean) {
  try {
    const url = new URL(value);
    const local =
      allowLocal &&
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
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function supabaseConfig(
  original: string,
  proxy: string,
  key: string,
  development: boolean,
) {
  if (!original || !key) {
    return {
      error:
        'Set the Supabase project URL and publishable key before signing in.',
    };
  }
  if (!key.startsWith('sb_publishable_')) {
    return {
      error:
        'Use the Supabase publishable key, never a secret or service-role key.',
    };
  }
  const upstream = apiOrigin(original, development);
  if (!upstream) {
    return {
      error:
        'The Supabase project URL must be a valid HTTPS origin without a path.',
    };
  }
  if (!proxy) {
    return { error: 'Set the Cloudflare Worker URL before signing in.' };
  }
  const endpoint = apiOrigin(proxy, development);
  if (!endpoint) {
    return {
      error:
        'The Supabase proxy URL must be a valid HTTPS origin without a path.',
    };
  }

  return {
    url: upstream.origin,
    proxy: endpoint.origin,
    key,
    // Match the SDK's existing default, even when the transport hostname changes.
    storageKey: `sb-${upstream.hostname.split('.')[0]}-auth-token`,
  };
}
