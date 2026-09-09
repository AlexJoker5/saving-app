import type { AuthState } from '../types/auth.type';
import { routePaths } from '../../../routes/routePaths';

export const authenticationPaths = [
  routePaths.login,
  routePaths.signup,
  routePaths.forgotPassword,
  routePaths.confirmEmail,
  routePaths.resetEmailSent,
  routePaths.resetPassword,
  routePaths.twoFactor,
  routePaths.twoFactorSetup,
];

export function authDestination(auth: AuthState) {
  if (auth.phase === 'signed-out') {
    return routePaths.login;
  }
  if (auth.phase === 'mfa-required') {
    return routePaths.twoFactor;
  }
  if (auth.phase !== 'signed-in') {
    return null;
  }
  if (!auth.factors.some((factor) => factor.verified)) {
    return routePaths.twoFactorSetup;
  }

  return auth.recovery ? routePaths.resetPassword : routePaths.home;
}
export const workspaceAuthenticated = (auth: AuthState) =>
  authDestination(auth) === routePaths.home;
