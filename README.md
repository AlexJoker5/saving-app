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

Recurring expenses currently have a **design-only form** under Expenses. Saving
recurring schedules is disabled. Automatic monthly rent/bills, month exceptions,
and ongoing rule changes require a separately approved data implementation.
No sample recurring records are inserted into the user's workspace.

## Authentication and account storage

The workspace requires Supabase email/password authentication followed by Google
Authenticator-compatible TOTP. First-time users must enroll and verify an
Authenticator. Account settings allow backup authenticators; removal of the last
verified factor is disabled in this interface. Sign-out returns to sign-in.

There is no guest workspace, local-data import, or storage switch in the active
interface. The app uses the existing account-owned Supabase workspace repository.
Missing configuration or a cloud error shows an unavailable/retry state, rather
than opening browser-local savings. Existing legacy local repository code remains
in the source, but the application workspace does not instantiate it. Existing
browser data is not erased or uploaded.

Each account owns one `public.workspaces` row containing JSON state, revision,
and update time. The existing migration defines owner and `aal2` RLS checks,
restricted grants, a 5 MiB document limit, and revision incrementing. Saves use
an expected revision; concurrent changes require review and retry. Failed saves
retain drafts. Account data uses an account-scoped in-memory cache, with refresh
on focus/reconnection and while visible. There is no offline write queue or
cross-account local persistence.

The user confirmed applying
`supabase/migrations/20260907190000_account_workspaces.sql` manually on September
8, 2026. This UI release makes **no database or Supabase dashboard changes**.
Live schema/grants/policies have not been independently runtime-verified. Future
schema changes must be supplied as SQL for the user to apply manually.

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
`https://saving-app-dusky.vercel.app/account` as the email callback. Local or
preview callbacks must be explicitly configured before enabling those flows.

Gmail SMTP was configured previously in Supabase using the service Gmail account
and an App Password entered directly by the user. Email delivery is not verified
in this release. Recovery returns to `/account`; enrolled users complete TOTP
before changing their password. Application-generated recovery codes are not
provided; users can enroll a backup authenticator.

## Backups and updates

Settings offers JSON download of the validated saved snapshot loaded in the tab,
including plans, entries, schedules, expenses, goals, Main selection, and budget.
Unsaved edits and remote changes not yet loaded are excluded. Authentication
credentials and secrets are not included. These financial backup files are plain
text, not encrypted.

Restoration accepts version 1 Saving backup files up to 20 MiB, validates their
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
browser, email, and RLS tests are skipped for this design release at the user's
request. Compilation and deployment readiness do not verify live user flows.
Existing test commands remain in package.json; older local-workspace browser
scenarios do not describe the new mandatory-auth interface.

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
