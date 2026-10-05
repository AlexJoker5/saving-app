import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConnectionRouter } from './createConnectionRouter';
import { countryRoute } from './countryRoute';
import {
  withConnectionTimeout,
  ConnectionNetworkError,
} from './connectionRequests';

const original = 'https://saving-project.supabase.co';
const proxy = 'https://saving-app.apexstack-work.workers.dev';
const preference = 'saving-cloudflare-fallback:saving-project.supabase.co';
const options = {
  original,
  proxy,
  key: 'sb_publishable_test',
  development: false,
};
let storage: Map<string, string>;
let requests: Request[];
let transport: (request: Request) => Promise<Response>;

beforeEach(() => {
  storage = new Map();
  requests = [];
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  transport = async (request) =>
    Response.json(
      request.url.endsWith('/api/connectionRoute')
        ? { route: 'direct' }
        : { ok: true },
    );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(
        typeof input === 'string' && input.startsWith('/')
          ? 'https://saving.example' + input
          : input,
        init,
      );
      requests.push(request);

      return transport(request);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Saving connection routing', () => {
  it('preserves the complete financial JSON body and revision query through the Worker', async () => {
    const router = createConnectionRouter({ ...options, development: true });
    await router.initialize();
    const body = '{"state":{"version":2,"note":"မြန်မာ"}}';
    let forwarded = '';
    transport = async (request) => {
      forwarded = await request.text();
      expect(request.url).toBe(proxy + '/rest/v1/workspaces?revision=eq.3');
      expect(request.headers.get('authorization')).toBe('Bearer test-session');
      expect(request.headers.get('prefer')).toBe('return=representation');

      return Response.json({ revision: 4 });
    };
    await router.fetch(original + '/rest/v1/workspaces?revision=eq.3', {
      method: 'PATCH',
      body,
      headers: {
        authorization: 'Bearer test-session',
        prefer: 'return=representation',
        'content-type': 'application/json',
      },
    });
    expect(forwarded).toBe(body);
  });
  it.each([
    ['MM', 'worker'],
    [null, 'worker'],
    ['XX', 'worker'],
    ['ZZ', 'worker'],
    ['SG', 'direct'],
    [' us ', 'direct'],
  ])('routes country %s to %s', (country, route) => {
    expect(countryRoute(country)).toBe(route);
  });
  it('uses the Worker in plain Vite without looking up a country or contacting direct Supabase', async () => {
    const router = createConnectionRouter({ ...options, development: true });
    await router.initialize();
    expect(requests.map((request) => request.url)).toEqual([
      proxy + '/auth/v1/settings',
    ]);
    expect(storage.size).toBe(0);
  });
  it('treats a missing/non-JSON country endpoint as unknown', async () => {
    transport = async (request) =>
      request.url.endsWith('/api/connectionRoute')
        ? new Response('<html>Vite</html>')
        : Response.json({ ok: true });
    const router = createConnectionRouter(options);
    await router.initialize();
    expect(router.getSnapshot().route).toBe('worker');
    expect(requests.some((request) => request.url.startsWith(original))).toBe(
      false,
    );
  });
  it('remembers a direct network failure across router instances and skips country lookup', async () => {
    transport = async (request) => {
      if (request.url.startsWith(original)) {
        throw new TypeError('Network unavailable');
      }

      return Response.json(
        request.url.endsWith('/api/connectionRoute')
          ? { route: 'direct' }
          : { ok: true },
      );
    };
    const router = createConnectionRouter(options);
    await router.initialize();
    expect(router.getSnapshot()).toMatchObject({
      phase: 'ready',
      route: 'worker',
    });
    expect(storage.get(preference)).toBe('worker');
    requests = [];
    await createConnectionRouter(options).initialize();
    expect(requests.map((request) => request.url)).toEqual([
      proxy + '/auth/v1/settings',
    ]);
  });
  it('does not mark HTTP authentication errors as network failures', async () => {
    const router = createConnectionRouter(options);
    await router.initialize();
    transport = async () =>
      Response.json({ message: 'Wrong password' }, { status: 400 });
    const response = await router.fetch(
      original + '/auth/v1/token?grant_type=password',
      { method: 'POST', body: '{}' },
    );
    expect(response.status).toBe(400);
    expect(router.getSnapshot().route).toBe('direct');
    expect(storage.size).toBe(0);
  });
  it('reports upstream service failures without permanently selecting the Worker', async () => {
    transport = async (request) =>
      Response.json(
        request.url.endsWith('/api/connectionRoute')
          ? { route: 'direct' }
          : { message: 'Unavailable' },
        { status: request.url.endsWith('/api/connectionRoute') ? 200 : 503 },
      );
    const router = createConnectionRouter(options);
    await expect(router.initialize()).rejects.toThrow('unavailable');
    expect(router.getSnapshot().phase).toBe('error');
    expect(storage.size).toBe(0);
  });
  it('retries an interrupted workspace read through the Worker with query/auth headers intact', async () => {
    const router = createConnectionRouter(options);
    await router.initialize();
    requests = [];
    transport = async (request) => {
      if (request.url.startsWith(original)) {
        throw new TypeError('Disconnected');
      }

      return Response.json(
        request.url.includes('/workspaces') ? { revision: 7 } : { ok: true },
      );
    };
    const response = await router.fetch(
      original + '/rest/v1/workspaces?select=state%2Crevision&revision=eq.6',
      {
        headers: { Authorization: 'Bearer test-session', apikey: options.key },
      },
    );
    expect(await response.json()).toEqual({ revision: 7 });
    const retried = requests.at(-1);
    expect(retried?.url).toBe(
      proxy + '/rest/v1/workspaces?select=state%2Crevision&revision=eq.6',
    );
    expect(retried?.headers.get('authorization')).toBe('Bearer test-session');
    expect(retried?.headers.get('apikey')).toBe(options.key);
  });
  it.each(['POST', 'PATCH'])(
    'does not replay an uncertain %s financial save',
    async (method) => {
      const router = createConnectionRouter(options);
      await router.initialize();
      requests = [];
      transport = async (request) => {
        if (request.url.startsWith(original)) {
          throw new TypeError('Response lost');
        }

        return Response.json({ ok: true });
      };
      await expect(
        router.fetch(original + '/rest/v1/workspaces?revision=eq.4', {
          method,
          body: '{"state":{}}',
        }),
      ).rejects.toThrow('may already have completed');
      expect(
        requests.filter((request) => request.url.includes('/workspaces')),
      ).toHaveLength(1);
      expect(router.getUncertainWorkspaceWrites()).toBe(1);
      expect(router.getSnapshot().route).toBe('worker');
    },
  );
  it('does not replay a login/password/MFA request during a route change', async () => {
    const router = createConnectionRouter(options);
    await router.initialize();
    requests = [];
    transport = async (request) => {
      if (request.url.startsWith(original)) {
        throw new TypeError('Response lost');
      }

      return Response.json({ ok: true });
    };
    await expect(
      router.fetch(original + '/auth/v1/token', { method: 'POST', body: '{}' }),
    ).rejects.toThrow('may already have completed');
    expect(
      requests.filter((request) => request.url.includes('/token')),
    ).toHaveLength(1);
    expect(router.getUncertainWorkspaceWrites()).toBe(0);
  });
  it('recovers a interrupted response body before reporting a read as successful', async () => {
    const router = createConnectionRouter(options);
    await router.initialize();
    transport = async (request) =>
      request.url.startsWith(original)
        ? new Response(
            new ReadableStream({
              start(controller) {
                controller.error(new TypeError('Body interrupted'));
              },
            }),
          )
        : Response.json({ ok: true });
    expect(
      await (await router.fetch(original + '/rest/v1/workspaces')).json(),
    ).toEqual({ ok: true });
    expect(router.getSnapshot().route).toBe('worker');
  });
  it('stays on the Worker when storage is blocked and retries only the Worker after failure', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('Blocked');
      },
      setItem() {
        throw new Error('Blocked');
      },
    });
    let down = true;
    transport = async (request) => {
      if (request.url.endsWith('/api/connectionRoute')) {
        return Response.json({ route: 'direct' });
      }
      if (request.url.startsWith(original) || down) {
        throw new TypeError('Unavailable');
      }

      return Response.json({ ok: true });
    };
    const router = createConnectionRouter(options);
    await expect(router.initialize()).rejects.toThrow();
    expect(router.getSnapshot()).toMatchObject({
      route: 'worker',
      phase: 'error',
    });
    down = false;
    requests = [];
    await router.initialize();
    expect(requests.map((request) => request.url)).toEqual([
      proxy + '/auth/v1/settings',
    ]);
  });
  it('honors caller cancellation without saving a failure preference', async () => {
    const router = createConnectionRouter(options);
    await router.initialize();
    const controller = new AbortController();
    controller.abort();
    await expect(
      router.fetch(original + '/rest/v1/workspaces', {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(storage.size).toBe(0);
    expect(router.getSnapshot().route).toBe('direct');
  });
  it('bounds stalled requests with a network timeout', async () => {
    vi.useFakeTimers();
    const operation = withConnectionTimeout(
      (signal) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason)),
        ),
      5000,
    );
    const rejected = expect(operation).rejects.toBeInstanceOf(
      ConnectionNetworkError,
    );
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
  });
});
