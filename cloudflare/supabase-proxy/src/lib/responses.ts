import {
  EXPOSED_HEADERS,
  FORWARDED_HEADERS,
  PREFLIGHT_MAX_AGE,
} from '../const/proxyConfig';

export function responseHeaders(
  origin: string | null,
  initial?: HeadersInit,
): Headers {
  const headers = new Headers(initial);
  // Supabase's CORS policy must not override this Worker's explicit origin policy.
  for (const name of [...headers.keys()]) {
    if (name.startsWith('access-control-')) {
      headers.delete(name);
    }
  }
  headers.delete('set-cookie');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Saving-Proxy', 'cloudflare');
  const vary = new Set(
    (headers.get('Vary') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  vary.add('Origin');
  headers.set('Vary', [...vary].join(', '));
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  }
  return headers;
}

export function jsonResponse(
  body: object,
  status: number,
  origin: string | null,
): Response {
  const headers = responseHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

export function preflight(
  request: Request,
  origin: string | null,
  methods: string[],
): Response {
  const requestedMethod =
    request.headers.get('Access-Control-Request-Method') || '';
  const requestedHeaders = (
    request.headers.get('Access-Control-Request-Headers') || ''
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (
    !origin ||
    !methods.includes(requestedMethod) ||
    requestedHeaders.some((name) => !FORWARDED_HEADERS.includes(name))
  ) {
    return jsonResponse(
      { message: 'This browser request method or header is not allowed.' },
      403,
      origin,
    );
  }
  const headers = responseHeaders(origin);
  headers.set('Access-Control-Allow-Methods', methods.join(', '));
  headers.set('Access-Control-Allow-Headers', FORWARDED_HEADERS.join(', '));
  headers.set('Access-Control-Max-Age', PREFLIGHT_MAX_AGE);
  headers.append(
    'Vary',
    'Access-Control-Request-Method, Access-Control-Request-Headers',
  );
  return new Response(null, { status: 204, headers });
}
