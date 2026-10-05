import { CONNECTION_REQUEST_TIMEOUT_MS } from '../const/connectionConfig';
import type {
  ConnectionOptions,
  ConnectionRoute,
  ConnectionSnapshot,
} from '../types/connectionTypes';
import { prefersCloudflare, rememberCloudflare } from './connectionPreference';
import {
  checkConnection,
  ConnectionNetworkError,
  detectConnectionRoute,
  withConnectionTimeout,
} from './connectionRequests';

export function createConnectionRouter(options: ConnectionOptions) {
  let route: ConnectionRoute | null = null;
  let snapshot: ConnectionSnapshot = {
    phase: 'preparing',
    route,
    message: 'Preparing your connection…',
  };
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  let uncertainWorkspaceWrites = 0;

  function update(phase: ConnectionSnapshot['phase'], message: string) {
    snapshot = { phase, route, message };
    listeners.forEach((listener) => listener());
  }

  function fail(error: unknown) {
    update(
      'error',
      error instanceof ConnectionNetworkError
        ? 'Could not connect to the Saving service. Check your internet connection and retry.'
        : 'The Saving service is unavailable. Please try again.',
    );
  }

  function useWorker() {
    route = 'worker';
    rememberCloudflare(options.original);
    update('switching', 'Reconnecting…');
  }

  function run(operation: () => Promise<void>) {
    if (pending) {
      return pending;
    }
    pending = operation()
      .catch((error: unknown) => {
        fail(error);
        throw error;
      })
      .finally(() => {
        pending = null;
      });

    return pending;
  }

  function initialize() {
    if (pending) {
      return pending;
    }
    if (snapshot.phase === 'ready') {
      return Promise.resolve();
    }

    return run(async () => {
      update('preparing', 'Preparing your connection…');
      if (prefersCloudflare(options.original)) {
        route = 'worker';
      }
      if (!route) {
        route = await detectConnectionRoute(options.development);
      }
      // Re-check after lookup in case another tab saved a fallback during the request.
      if (prefersCloudflare(options.original)) {
        route = 'worker';
      }
      try {
        await checkConnection(
          route === 'direct' ? options.original : options.proxy,
          options.key,
        );
      } catch (error) {
        if (route !== 'direct' || !(error instanceof ConnectionNetworkError)) {
          throw error;
        }
        useWorker();
        await checkConnection(options.proxy, options.key);
      }
      update('ready', '');
    });
  }

  function switchToWorker() {
    if (pending) {
      return pending;
    }
    if (route === 'worker' && snapshot.phase === 'ready') {
      return Promise.resolve();
    }

    return run(async () => {
      useWorker();
      await checkConnection(options.proxy, options.key);
      update('ready', '');
    });
  }

  async function waitUntilReady() {
    if (pending) {
      await pending;
    }
    if (snapshot.phase !== 'ready') {
      throw new Error(snapshot.message);
    }
    if (route === 'direct' && prefersCloudflare(options.original)) {
      await switchToWorker();
    }
  }

  async function routedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== options.original) {
      return fetch(request);
    }
    await waitUntilReady();
    request.signal.throwIfAborted();
    const attemptedRoute = route;
    const replayable = request.method === 'GET' || request.method === 'HEAD';
    const retryRequest = replayable ? request.clone() : null;

    async function send(outgoing: Request) {
      const target = new URL(outgoing.url);
      const origin = route === 'direct' ? options.original : options.proxy;
      // Assign the origin separately so paths/query parameters cannot select another host.
      const endpoint = new URL(origin);
      endpoint.pathname = target.pathname;
      endpoint.search = target.search;

      return withConnectionTimeout(
        async (signal) => {
          // Saving sends bounded JSON documents. Buffering avoids introducing
          // streaming-upload restrictions when changing the request origin.
          const requestBody = outgoing.body
            ? await outgoing.arrayBuffer()
            : undefined;
          const response = await fetch(endpoint, {
            method: outgoing.method,
            headers: outgoing.headers,
            body: requestBody,
            signal,
            cache: 'no-store',
            redirect: 'error',
            credentials: 'omit',
          });
          if (!response.body) {
            return response;
          }
          // Finish receiving the body before declaring success, so an interrupted JSON
          // response or report download can follow the same connection recovery rules.
          const body = await response.arrayBuffer();

          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        },
        CONNECTION_REQUEST_TIMEOUT_MS,
        outgoing.signal,
      );
    }

    try {
      return await send(request);
    } catch (error) {
      if (
        !(error instanceof ConnectionNetworkError) ||
        request.signal.aborted
      ) {
        throw error;
      }
      if (!replayable && url.pathname === '/rest/v1/workspaces') {
        uncertainWorkspaceWrites += 1;
      }
      if (attemptedRoute !== 'direct') {
        fail(error);
        throw error;
      }
      await switchToWorker();
      if (!retryRequest) {
        throw new Error(
          'The connection changed while this request was in progress. Review the latest records before trying again; the request may already have completed.',
          { cause: error },
        );
      }
      await waitUntilReady();
      try {
        return await send(retryRequest);
      } catch (retryError) {
        if (
          retryError instanceof ConnectionNetworkError &&
          !retryRequest.signal.aborted
        ) {
          fail(retryError);
        }
        throw retryError;
      }
    }
  }

  return {
    initialize,
    fetch: routedFetch,
    getSnapshot: () => snapshot,
    getUncertainWorkspaceWrites: () => uncertainWorkspaceWrites,
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
