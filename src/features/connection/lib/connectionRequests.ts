import {
  CONNECTION_CHECK_TIMEOUT_MS,
  COUNTRY_ROUTE_PATH,
} from '../const/connectionConfig';
import type { ConnectionRoute } from '../types/connectionTypes';

export class ConnectionNetworkError extends Error {
  constructor() {
    super('The connection could not be reached.');
    this.name = 'ConnectionNetworkError';
  }
}

export async function withConnectionTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeout: number,
  callerSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, controller.signal])
    : controller.signal;
  try {
    return await operation(signal);
  } catch (error) {
    if (callerSignal?.aborted) {
      throw error;
    }
    if (controller.signal.aborted || error instanceof TypeError) {
      throw new ConnectionNetworkError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function detectConnectionRoute(
  development: boolean,
): Promise<ConnectionRoute> {
  // Plain Vite has no server geolocation headers. Treat local development as unknown.
  if (development) {
    return 'worker';
  }
  try {
    return await withConnectionTimeout(async (signal) => {
      const response = await fetch(COUNTRY_ROUTE_PATH, {
        signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return 'worker';
      }
      const data: unknown = await response.json();

      return data &&
        typeof data === 'object' &&
        'route' in data &&
        data.route === 'direct'
        ? 'direct'
        : 'worker';
    }, CONNECTION_CHECK_TIMEOUT_MS);
  } catch {
    return 'worker';
  }
}

export async function checkConnection(origin: string, key: string) {
  await withConnectionTimeout(async (signal) => {
    const response = await fetch(origin + '/auth/v1/settings', {
      signal,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      headers: { apikey: key, Accept: 'application/json' },
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      throw new ConnectionNetworkError();
    }
    if (!data || typeof data !== 'object') {
      throw new ConnectionNetworkError();
    }
    if (response.status >= 500) {
      throw new Error('The Saving service is unavailable. Please try again.');
    }
    // A valid 4xx response proves reachability. Auth/configuration errors remain visible
    // through the SDK rather than being mistaken for an ISP connection failure.
  }, CONNECTION_CHECK_TIMEOUT_MS);
}
