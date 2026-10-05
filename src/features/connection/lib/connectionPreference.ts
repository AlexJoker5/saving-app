import { CLOUDFLARE_PREFERENCE_PREFIX } from '../const/connectionConfig';

function preferenceKey(original: string) {
  return CLOUDFLARE_PREFERENCE_PREFIX + new URL(original).hostname;
}

export function prefersCloudflare(original: string) {
  try {
    return localStorage.getItem(preferenceKey(original)) === 'worker';
  } catch {
    return false;
  }
}

export function rememberCloudflare(original: string) {
  try {
    localStorage.setItem(preferenceKey(original), 'worker');
  } catch {
    // The active router still stays on the Worker if browser storage is unavailable.
  }
}
