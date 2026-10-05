import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../cloudflare/supabase-proxy/src/index';

const origin = 'https://saving-app-dusky.vercel.app';
const workerOrigin = 'https://saving-app.apexstack-work.workers.dev';
const upstream = 'https://saving-project.supabase.co';
const env = { SUPABASE_URL: upstream, ALLOWED_ORIGINS: origin };
const factor = '7e5fce5d-7cda-4e59-aedb-07054c86b1d4';

function request(path: string, method = 'GET', headers: HeadersInit = {}) {
  return new Request(workerOrigin + path, {
    method,
    headers: { Origin: origin, apikey: 'sb_publishable_test', ...headers },
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('dedicated Saving Worker', () => {
  it('reports health/configuration without contacting Supabase', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(
      await (
        await worker.fetch(new Request(workerOrigin + '/health'), env)
      ).json(),
    ).toEqual({ ok: true, service: 'saving-app', configured: true });
    expect(
      await (
        await worker.fetch(new Request(workerOrigin + '/health'), {})
      ).json(),
    ).toMatchObject({ configured: false });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ['/auth/v1/signup', 'POST'],
    ['/auth/v1/recover', 'POST'],
    ['/auth/v1/token', 'POST'],
    ['/auth/v1/logout', 'POST'],
    ['/auth/v1/user', 'GET'],
    ['/auth/v1/user', 'PUT'],
    ['/auth/v1/factors', 'POST'],
    [`/auth/v1/factors/${factor}/challenge`, 'POST'],
    [`/auth/v1/factors/${factor}/verify`, 'POST'],
    [`/auth/v1/factors/${factor}`, 'DELETE'],
    ['/rest/v1/workspaces', 'GET'],
    ['/rest/v1/workspaces', 'POST'],
    ['/rest/v1/workspaces', 'PATCH'],
  ])('allows Saving route %s %s', async (path, method) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    expect((await worker.fetch(request(path, method), env)).status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('forwards revision filters, authorization, method, body and response status', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json([{ revision: 5 }], {
        status: 201,
        headers: {
          'Content-Range': '0-0/1',
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': 'should-not-forward',
        },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const body = '{"state":{"version":2}}';
    const response = await worker.fetch(
      new Request(
        workerOrigin + '/rest/v1/workspaces?user_id=eq.user&revision=eq.4',
        {
          method: 'PATCH',
          body,
          headers: {
            Origin: origin,
            apikey: 'sb_publishable_test',
            Authorization: 'Bearer test-user',
            Prefer: 'return=representation',
            'Content-Type': 'application/json',
            Cookie: 'ignored',
          },
        },
      ),
      env,
    );
    const [target, init] = fetch.mock.calls[0];
    expect(target).toBe(
      upstream + '/rest/v1/workspaces?user_id=eq.user&revision=eq.4',
    );
    expect(init.method).toBe('PATCH');
    expect(init.headers.get('authorization')).toBe('Bearer test-user');
    expect(init.headers.get('prefer')).toBe('return=representation');
    expect(init.headers.get('cookie')).toBeNull();
    expect(await new Response(init.body).text()).toBe(body);
    expect(init.redirect).toBe('manual');
    expect(response.status).toBe(201);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('content-range')).toBe('0-0/1');
  });
  it.each([
    '/rest/v1/other-table',
    '/rest/v1/rpc/attendance_commit',
    '/auth/v1/admin/users',
    '/storage/v1/object/zoom-originals/file',
    '//evil.example/rest/v1/workspaces',
  ])('rejects unrelated endpoint %s', async (path) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await worker.fetch(request(path), env)).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects unauthorized origins, missing API keys, wrong methods and arbitrary upstreams', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(
      (
        await worker.fetch(
          request('/rest/v1/workspaces', 'GET', {
            Origin: 'https://evil.example',
          }),
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await worker.fetch(
          new Request(workerOrigin + '/rest/v1/workspaces'),
          env,
        )
      ).status,
    ).toBe(401);
    expect(
      (await worker.fetch(request('/rest/v1/workspaces', 'DELETE'), env))
        .status,
    ).toBe(405);
    expect(
      (
        await worker.fetch(request('/rest/v1/workspaces'), {
          ...env,
          SUPABASE_URL: 'https://evil.example',
        })
      ).status,
    ).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('allows browser preflights for MFA and revision saves, rejecting unlisted headers', async () => {
    const good = await worker.fetch(
      request('/rest/v1/workspaces', 'OPTIONS', {
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers':
          'authorization,apikey,content-type,prefer',
      }),
      env,
    );
    expect(good.status).toBe(204);
    expect(good.headers.get('access-control-allow-origin')).toBe(origin);
    const bad = await worker.fetch(
      request('/rest/v1/workspaces', 'OPTIONS', {
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'x-arbitrary-header',
      }),
      env,
    );
    expect(bad.status).toBe(403);
  });
  it.each(['signup', 'recovery'])(
    'allows %s email navigation without an API key and preserves the callback fragment',
    async (type) => {
      const callback = origin + '/account#access_token=test-token&type=' + type;
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 302, headers: { Location: callback } }),
        );
      vi.stubGlobal('fetch', fetch);
      const response = await worker.fetch(
        new Request(
          workerOrigin +
            '/auth/v1/verify?token=test-hash&type=' +
            type +
            '&redirect_to=' +
            encodeURIComponent(origin + '/account'),
        ),
        env,
      );
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(callback);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    },
  );
  it('rejects an untrusted email callback before contacting upstream', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(
      new Request(
        workerOrigin +
          '/auth/v1/verify?token=test-hash&redirect_to=' +
          encodeURIComponent('https://evil.example/account'),
      ),
      env,
    );
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not follow redirects with credentials or return tokens to an untrusted site', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: 'https://evil.example/account#access_token=test-token',
        },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(
      new Request(
        workerOrigin +
          '/auth/v1/verify?token=test-hash&redirect_to=' +
          encodeURIComponent(origin + '/account'),
      ),
      env,
    );
    expect(response.status).toBe(502);
    expect(response.headers.get('location')).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('retains Supabase permission errors and returns a readable transport failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { message: 'RLS denied', code: '42501' },
          { status: 403 },
        ),
      )
      .mockRejectedValueOnce(new TypeError('Network failure'));
    vi.stubGlobal('fetch', fetch);
    const denied = await worker.fetch(request('/rest/v1/workspaces'), env);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: '42501' });
    const down = await worker.fetch(request('/rest/v1/workspaces'), env);
    expect(down.status).toBe(502);
    expect(await down.json()).toMatchObject({
      message: expect.stringContaining('could not reach Supabase'),
    });
  });
});
