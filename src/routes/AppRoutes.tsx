import { LoginPage } from '../features/auth/LoginPage';
import { SignupPage } from '../features/auth/SignupPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ConfirmEmailPage } from '../features/auth/ConfirmEmailPage';
import { ResetEmailSentPage } from '../features/auth/ResetEmailSentPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { TwoFactorPage } from '../features/auth/TwoFactorPage';
import { AuthenticatorSetupPage } from '../features/auth/AuthenticatorSetupPage';
import { RemoveAuthenticatorPage } from '../features/auth/RemoveAuthenticatorPage';
import { AuthRouteGate } from '../features/auth/components/AuthRouteGate';
import { ExpenseDetailsPage } from '../features/expenses/ExpenseDetailsPage';
import { HomePage } from '../features/home/HomePage';
import { PlanComparisonPage } from '../features/plans/PlanComparisonPage';
import { RecurringExpensesPage } from '../features/expenses/RecurringExpensesPage';
import { AccountPage } from '../features/auth/AccountPage';
import { AuthGate } from '../features/auth/components/AuthGate';
import { Route, Routes } from 'react-router';
import { WorkspacePage } from '../features/workspace/WorkspacePage';
import { GoalsPage } from '../features/goals/GoalsPage';
import { PlansPage } from '../features/plans/PlansPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { SavingsPage } from '../features/savings/SavingsPage';
import { SetupPage } from '../features/settings/SetupPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from './NotFoundPage';
import { routePaths } from './routePaths';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<WorkspacePage />}>
        <Route element={<AuthRouteGate screen="public" />}>
          <Route path={routePaths.login} element={<LoginPage />} />
          <Route path={routePaths.signup} element={<SignupPage />} />
          <Route
            path={routePaths.forgotPassword}
            element={<ForgotPasswordPage />}
          />
          <Route
            path={routePaths.confirmEmail}
            element={<ConfirmEmailPage />}
          />
          <Route
            path={routePaths.resetEmailSent}
            element={<ResetEmailSentPage />}
          />
        </Route>
        <Route element={<AuthRouteGate screen="verify" />}>
          <Route path={routePaths.twoFactor} element={<TwoFactorPage />} />
        </Route>
        <Route element={<AuthRouteGate screen="enroll" />}>
          <Route
            path={routePaths.twoFactorSetup}
            element={<AuthenticatorSetupPage />}
          />
        </Route>
        <Route element={<AuthRouteGate screen="reset" />}>
          <Route
            path={routePaths.resetPassword}
            element={<ResetPasswordPage />}
          />
        </Route>
        <Route element={<AuthRouteGate screen="account" />}>
          <Route path={routePaths.account} element={<AccountPage />} />
          <Route
            path={routePaths.addAuthenticator}
            element={<AuthenticatorSetupPage backup />}
          />
          <Route
            path="/account/authenticators/:factorId/remove"
            element={<RemoveAuthenticatorPage />}
          />
        </Route>
        <Route element={<AuthGate />}>
          <Route path={routePaths.home} element={<HomePage />} />
          <Route path={routePaths.goals} element={<GoalsPage />} />
          <Route path="/plans/compare" element={<PlanComparisonPage />} />
          <Route path="/plans/:planId" element={<SavingsPage />} />
          <Route
            path="/plans/:planId/months/:monthId"
            element={<SavingsPage />}
          />
          <Route path="/savings/months/:monthId" element={<SavingsPage />} />
          <Route
            path="/expenses/recurring"
            element={<RecurringExpensesPage />}
          />
          <Route path={routePaths.plans} element={<PlansPage />} />
          <Route
            path="/plans/:planId/recurring"
            element={<RecurringExpensesPage />}
          />
          <Route path="/expenses/:expenseId" element={<ExpenseDetailsPage />} />
          <Route path={routePaths.expenses} element={<ExpensesPage />} />
          <Route path={routePaths.savings} element={<SavingsPage />} />
          <Route path={routePaths.setup} element={<SetupPage />} />
          <Route path={routePaths.settings} element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
