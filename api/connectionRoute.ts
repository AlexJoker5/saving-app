import { countryRoute } from '../src/features/connection/lib/countryRoute';

export default {
  fetch(request: Request) {
    const headers = {
      'Cache-Control': 'private, no-store',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (request.method !== 'GET')
      return Response.json(
        { error: 'Method not allowed.' },
        { status: 405, headers: { ...headers, Allow: 'GET' } },
      );
    // Vercel supplies this header from the public IP. A VPN exit is that IP location.
    // No IP/country is returned or stored, and the client cannot supply a country query.
    const route = countryRoute(request.headers.get('x-vercel-ip-country'));
    return Response.json({ route }, { headers });
  },
};
