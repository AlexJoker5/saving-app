# Saving

A React, Vite, and TypeScript app for savings, expenses, independent plans,
and goal forecasts. The mobile interface follows the approved green design v1.5,
with Home, Saving, Expenses, Goals, Plans, and Settings in the bottom navigation.

## Current interface

- **Home** shows Main savings, budget and goal summaries, recent expenses, and
  quick actions for adding money or an expense.
- **Saving** shows a selected month's closing balance, a browsable timeline,
  and dedicated month details. Existing contribution adjustments, schedules,
  additions, and withdrawals keep their revision-protected save flows.
- **Expenses** separates budget spending, savings spending, and recorded saving.
  Filters open in a sheet. Each expense has a details page with edit/delete
  actions. Savings-funded expenses and Saving-labelled records update their
  linked Main entries in the same workspace save.
- **Plans** has dedicated plan and month pages. Comparison uses month rows and
  plan columns, a sticky month column, readable balances, and signed differences
  from Main. Plan management retains snapshot, rename, delete, and reviewed Main
  promotion. Expense changes affect Main; independent snapshots stay independent.
- **Goals** retains target editing and plan forecasts. Goals do not reserve or
  deduct money. Its existing forecast range is 120 months; this is separate from
  the browsable plan timelines.
- **Settings** groups account/security, connection information, monthly budget,
  JSON backups/restoration, and app updates.

Plan timelines and the comparison table calculate six-month windows on demand.
Forward paging is not capped at two months, 120 months, or 100 years. The month
control accepts valid four-digit calendar years. Existing saved transaction and
schedule validation still uses 2000–2099; farther-out months are read-only
projections. The interface explains when editing is unavailable.

Recurring expenses are managed under Expenses or inside each plan. Rent, bills,
and other defaults generate one occurrence per month on demand, without creating
an unbounded set of database rows. A day past the end of a month uses that month's
last day. Future occurrences are planned amounts, not confirmations of payment.

- **This month only** overrides amount, name, label, funding source, and day for
  one month. **Use monthly default again** removes that exception.
- **From this month onward** replaces that month's and all later default changes.
  Earlier defaults remain. Month-only exceptions still take precedence.
- An amount of **0** skips one month or pauses ongoing spending. A later positive
  ongoing amount resumes the rule. Historical rules are retained rather than deleted.
- Budget-funded occurrences count toward monthly spending. Savings-funded ones
  also reduce that plan's savings projection and count toward today's balance
  when their date arrives. Budget overspending never creates a withdrawal.
- Snapshots copy recurring rules. Independent edits stay in that plan. Main
  promotion reviews recurring rules as well as connected one-off entries;
  switching Main changes its recurring history and future defaults together.
- Existing one-off records stay separate. Start a recurring rule after months
  already recorded to avoid counting an expense twice.

## Authentication and account storage

Authentication uses separate routes and page components:

| Route                                      | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `/login`                                   | Email/password sign-in                         |
| `/signup`                                  | Account creation                               |
| `/confirm-email`                           | Email confirmation instructions after signup   |
| `/forgot-password`                         | Request a recovery email                       |
| `/reset-email-sent`                        | Recovery email acknowledgement                 |
| `/2fa`                                     | Verify an existing authenticator               |
| `/2fa/setup`                               | First authenticator enrollment                 |
| `/reset-password`                          | Set a new password after recovery verification |
| `/account`                                 | Authenticated Account & Security settings      |
| `/account/authenticators/new`              | Add a backup authenticator                     |
| `/account/authenticators/:factorId/remove` | Review and verify removal                      |

Each route has an authentication-state guard. Signed-out visitors go to `/login`.
Users with an enabled authenticator must verify at `/2fa`; users without one can
continue with email/password. Recovery sessions require authenticator verification
only when the account has enrolled 2FA, then continue to `/reset-password`.
Visiting a URL does not grant authentication or mark an email confirmed.

Before first savings setup, `/2fa/setup` offers **Set up 2FA** and **Skip for now**.
Skipping also works after generating an unverified QR code. The QR secret is
removed from the screen; unfinished factors remain available for cleanup on a
later enrollment visit. The skip preference is account-scoped in session storage,
with an in-memory fallback when storage is blocked. It controls only the offer,
never authentication or database access. Once savings are set up, returning users
are not prompted to enroll again. Settings → Account & security offers **Enable
2FA**; enrolled users can add backup authenticators. Removal of the last verified
factor remains disabled in this interface.

Savings setup is a separate required onboarding step at `/setup`. Until an
account has a saved, non-demo workspace, direct app/account links return to setup.
Only the branding, setup form, and sign-out action appear: no bottom tabs, Home,
account shortcuts, connection shortcut, or example workspace. Loading and initial
load errors also hide navigation. The six tabs appear only after setup saves
successfully. Existing completed workspaces open normally. Authentication routes
remain separate and never load financial data; account settings are available
only after savings setup.

There is no guest workspace, local-data import, or storage switch in the active
interface. The app uses the existing account-owned Supabase workspace repository.
Missing configuration or a cloud error shows an unavailable/retry state, rather
than opening browser-local savings. Existing legacy local repository code remains
in the source, but the application workspace does not instantiate it. Existing
browser data is not erased or uploaded.

Each account owns one `public.workspaces` row containing JSON state, revision,
and update time. The initial migration defines owner and `aal2` RLS checks,
restricted grants, a 5 MiB document limit, and revision incrementing. Saves use
an expected revision; concurrent changes require review and retry. Failed saves
retain drafts. Account data uses an account-scoped in-memory cache, with refresh
on focus/reconnection and while visible. There is no offline write queue or
cross-account local persistence.

The user confirmed applying
`supabase/migrations/20260907190000_account_workspaces.sql` manually on September
8, 2026, and `supabase/migrations/20260909090000_recurring_workspace_format.sql`
on September 9, 2026. Both scripts are supplied for manual execution; the agent
does not run database migrations. Fresh projects require these scripts in order, followed by the optional-MFA migration below.
The second script accepts workspace versions 1 and 2 and prevents downgrading a
version 2 account from an older app tab. New cloud saves use version 2. Existing
version 1 data remains readable; there is no bulk rewrite. That format migration preserves the original owner/AAL2 policies, column grants,
the size limit, and revision checks.

Before deploying this onboarding update, manually run
`supabase/migrations/20260910090000_optional_mfa.sql`. This changes workspace access
to the [Supabase opt-in MFA model](https://supabase.com/docs/guides/auth/auth-mfa):
account ownership is always required; `aal1` is allowed only when the account has
no verified MFA factors, and `aal2` is accepted for verified sessions. A restrictive
policy enforces this alongside the ownership policies. A private, fixed-search-path
function checks only the caller's live factor records without granting clients
access to the Auth tables. User-editable metadata and the onboarding skip preference
are not used for authorization. No workspace rows, financial state, revision rules,
or column grants are changed. The SQL is prepared but has not been executed or
runtime-verified by the agent; application deployment must follow manual application.

## Development and configuration

Use Node.js 22.19 or newer within the Node.js 22 release line:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and set the Supabase URL and public publishable
key. Never put a service-role key, SMTP password, or other secret in `VITE_`
variables. The Supabase SDK loads separately from the main application bundle.

- `VITE_CLOUD_WORKSPACE_ENABLED=true` enables the existing account storage.
  If false, authenticated users see an unavailable screen; it does not enable
  local savings. Enable only against a project with the existing schema applied.
- `VITE_AUTH_EMAIL_ENABLED=true` exposes signup and recovery after SMTP, email
  confirmation, and trusted Auth callback URLs have been configured.

Production has both flags enabled. Preview and Development retain their disabled
configuration. Supabase's production Site URL is
`https://saving-app-dusky.vercel.app`, with
`https://saving-app-dusky.vercel.app/account` as the existing trusted email callback.
This address remains compatible with already-sent links: once Supabase resolves
the session, route guards dispatch to verification, enrollment, password reset,
or authenticated account settings. The existing callback allow-list remains valid; the optional-MFA SQL described above is required for this onboarding release. Local or
preview callbacks must be explicitly configured before enabling those flows.

Gmail SMTP was configured previously in Supabase using the service Gmail account
and an App Password entered directly by the user. Email delivery is not verified
in this release. Recovery links enter through `/account`, then route to `/2fa`
when enrolled-factor verification is needed and `/reset-password` to choose a new password. Application-generated recovery codes are not
provided; users can enroll a backup authenticator.

## Backups and updates

Settings offers JSON download of the validated saved snapshot loaded in the tab,
including plans, entries, schedules, recurring rules and exceptions, expenses,
goals, Main selection, and budget.
Unsaved edits and remote changes not yet loaded are excluded. Authentication
credentials and secrets are not included. These financial backup files are plain
text, not encrypted.

Restoration accepts the version 1 backup envelope with workspace format 1 or 2,
up to 20 MiB, and validates the
workspace contents, and requires an explicit replacement review. It replaces the
workspace rather than merging records. The reviewed destination revision protects
against overwriting concurrent changes. Authentication settings are unaffected.
Backup controls are available after account workspace setup in Settings.

Production checks for app updates on opening, focus/reconnection, and hourly
while visible. A manual **Check for updates** control is in Settings. Save open
forms before choosing **Update now**; **Later** keeps the running version. An app
update does not clear or rewrite saved workspace data.

## Source and validation

Features own their components, types, schemas, hooks, and utilities. Pages access
persistence through workspace hooks. ESLint checks React hooks and dependency
boundaries. New Lucide icons should use explicit imports.

```sh
npm run format:check
npm run lint
VITE_CLOUD_WORKSPACE_ENABLED=true VITE_AUTH_EMAIL_ENABLED=true npm run build
```

The build runs TypeScript and Vite. GitHub CI runs lint and build. Application,
browser, email, and RLS tests are skipped for this implementation step at the user's
request. Compilation and deployment readiness do not verify live user flows.
Existing test commands remain in package.json; older local-workspace browser
scenarios do not describe the current account-only interface.

## Project links and documentation

- [Production app](https://saving-app-dusky.vercel.app)
- [Private repository](https://github.com/Lazy-Ass-Developers/saving-app)
- [Supabase project](https://supabase.com/dashboard/project/ujmfbmyzqkbyzjiyjnjk)
- [Current project status](docs/PROJECT_STATUS.md)
- [Approved design baseline](docs/design/DESIGN_BASELINE.md)
- [Architecture](docs/ARCHITECTURE.md)

Vercel's SPA fallback supports direct feature/detail URLs. Handoff and design
documents remain local under the existing Git ignore rules. Historical documents
may describe optional sign-in or local workspaces; this README and the current
project status supersede that behavior.

## Publication handoff

The user handles GitHub pushes and Vercel deployments. The agent prepares approved
implementation changes and documentation, runs formatting/lint/build checks, and
reports when they are ready. SQL is always supplied for the user to run manually.
For this update: apply `20260910090000_optional_mfa.sql` first, then commit/push the
changed source, README, and migration and deploy. The previous authentication-route
release was deployed by the user; it is no longer blocked on the agent's network.
