// This is an onboarding preference, never an authentication or data-access check.
// It stores no financial data, credentials, factors, or setup secrets.
const skipped = new Set<string>();
const key = (userId: string) => `saving.onboarding.skip-2fa:${userId}`;

export function hasSkippedEnrollment(userId: string) {
  if (skipped.has(userId)) {
    return true;
  }
  try {
    return sessionStorage.getItem(key(userId)) === 'true';
  } catch {
    return false;
  }
}

export function skipEnrollment(userId: string) {
  skipped.add(userId);
  try {
    sessionStorage.setItem(key(userId), 'true');
  } catch {
    // The current tab can continue even when browser storage is unavailable.
  }
}
