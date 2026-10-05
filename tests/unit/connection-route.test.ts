import { describe, expect, it } from 'vitest';
import handler from '../../api/connectionRoute';

describe('Vercel connection decision', () => {
  it.each([
    ['MM', 'worker'],
    ['SG', 'direct'],
    ['XX', 'worker'],
    [null, 'worker'],
  ])('uses Vercel country %s', async (country, route) => {
    const response = handler.fetch(
      new Request(
        'https://saving.example/api/connectionRoute?country=SG&route=direct',
        { headers: country ? { 'x-vercel-ip-country': country } : {} },
      ),
    );
    expect(await response.json()).toEqual({ route });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
  });
  it('rejects writes without exposing visitor data', () => {
    const response = handler.fetch(
      new Request('https://saving.example/api/connectionRoute', {
        method: 'POST',
      }),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
});
