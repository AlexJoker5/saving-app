import { routeMethods } from './const/proxyConfig';
import {
  allowedCallback,
  allowedOrigins,
  upstreamOrigin,
} from './lib/configuration';
import { forwardRequest } from './lib/forwardRequest';
import { jsonResponse, preflight } from './lib/responses';
import type { WorkerEnvironment } from './types/workerTypes';

export default {
  async fetch(request: Request, env: WorkerEnvironment): Promise<Response> {
    const path = new URL(request.url).pathname;
    const requestedOrigin = request.headers.get('Origin');
    let origin: string | null = null;
    let upstream: string;
    let allowed: Set<string>;
    try {
      allowed = allowedOrigins(env);
      if (requestedOrigin && !allowed.has(requestedOrigin)) {
        return jsonResponse(
          { message: 'This website origin is not allowed.' },
          403,
          null,
        );
      }
      origin = requestedOrigin;
      upstream = upstreamOrigin(env);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'Invalid Worker configuration.';
      if (path === '/health' && request.method === 'GET') {
        return jsonResponse(
          { ok: true, service: 'saving-app', configured: false, message },
          200,
          origin,
        );
      }
      return jsonResponse({ message }, 503, origin);
    }
    if (path === '/health' && request.method === 'GET') {
      // Checks Worker reachability and configuration only; it does not query Supabase.
      return jsonResponse(
        { ok: true, service: 'saving-app', configured: true },
        200,
        origin,
      );
    }
    const methods = routeMethods(path);
    if (!methods.length) {
      return jsonResponse(
        { message: 'This API route is not supported by Saving.' },
        404,
        origin,
      );
    }
    if (request.method === 'OPTIONS') {
      return preflight(request, origin, methods);
    }
    if (!methods.includes(request.method)) {
      return jsonResponse(
        { message: 'This request method is not allowed.' },
        405,
        origin,
      );
    }
    const emailVerification =
      request.method === 'GET' && path === '/auth/v1/verify';
    if (
      emailVerification &&
      !allowedCallback(
        new URL(request.url).searchParams.get('redirect_to') ?? '',
        allowed,
      )
    ) {
      return jsonResponse(
        {
          message:
            'Use an email link with an allowed Saving /account callback.',
        },
        400,
        origin,
      );
    }
    if (!emailVerification && !request.headers.get('apikey')) {
      return jsonResponse(
        { message: 'A Supabase publishable API key is required.' },
        401,
        origin,
      );
    }
    // Supabase validates email tokens and user sessions; workspace RLS remains mandatory.
    return forwardRequest(request, upstream, origin, allowed);
  },
};
