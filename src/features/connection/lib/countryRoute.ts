import { COUNTRY_CODES } from '../const/connectionConfig';
import type { ConnectionRoute } from '../types/connectionTypes';

export function countryRoute(value: string | null): ConnectionRoute {
  const country = value?.trim().toUpperCase();

  return country && country !== 'MM' && COUNTRY_CODES.has(country)
    ? 'direct'
    : 'worker';
}
