# Saving

A React, Vite, and TypeScript project for savings, expenses, independent plans,
and goal forecasts.

**Current status:** local setup, savings, expenses, plans, goals, and settings are connected. The home route opens
`/savings`, with a monthly breakdown, month navigation, one-month contribution
adjustments, ongoing schedule changes, reset to the schedule, and direct entry
create/edit/delete. Ongoing changes apply from the selected month until the next
schedule, preserving month adjustments and Saving-record precedence.
Extra additions and withdrawals appear in the selected month with planned-date
labels. Deletion requires confirmation; expense-linked records are read-only here. `/setup` replaces the labelled example
workspace with your own starting balance, monthly saving, and spending budget.
Changes persist with revision-conflict protection: browser-local while signed out,
or in the account-owned cloud workspace after sign-in and authenticator verification.

`/expenses` lists monthly records, separates budget spending, savings spending,
and recorded saving, and supports create/edit/delete through one Paid from form.
Savings-funded expenses and Saving-labelled records update their Main entries
in the same saved workspace. Deletion requires confirmation. Label and Paid from
filters narrow the record list while the summary keeps full-month totals.

`/plans` supports independent snapshots, rename/delete, month-end comparison,
and Main promotion. View/edit opens a chosen plan in the savings page. Main
cannot be deleted. Promotion reviews differences in linked expenses and requires
explicit consent to reconcile them, preserving the former Main as an independent
plan. Later expense changes affect Main only.

`/goals` supports create/edit/delete, choosing a forecast plan, and comparison
across every plan. It finds the first month-end balance meeting each target
within the displayed forecast range (up to 120 months, limited by the plan's
100-year timeline). Existing savings count; goals are independent and never
reserve or deduct money. A past qualifying date does not confirm affordability
today. Missing results are labelled as not reached within the forecast range.

`/settings` updates the workspace-wide monthly spending budget with revision
protection. The budget applies to every month. It also offers downloadable JSON
backups of the saved local or cloud workspace currently loaded in the tab,
and restoring a backup after validation and an explicit replacement review.

`/account` provides Supabase email/password sign-in and Google Authenticator
(TOTP) setup. Enrolled accounts must verify a six-digit code after password
sign-in. Account settings support backup authenticators and verified removal.
Signup confirmation and password recovery are enabled in production through
Gmail SMTP. Email delivery has not been exercised as part of this release.
Cloud workspace storage and explicit local-data import are enabled for Production
with `VITE_CLOUD_WORKSPACE_ENABLED=true`. Signed-out visitors retain browser-local
savings. Local data is copied to an account only after review and confirmation.

## Project documentation

- [Agent handoff: completed work and remaining implementation](docs/IMPLEMENTATION_HANDOFF.md)
- [Architecture and dependency boundaries](docs/ARCHITECTURE.md)
- [Implementation defaults and current scope](docs/DECISIONS.md)
- [Original discussion handoff](docs/SAVING_APP_HANDOFF.md)

## Development

Use Node.js 22.19 or newer within the Node.js 22 release line. Install the exact
lockfile dependencies with `npm ci`, then start the app with `npm run dev`.

## Authentication configuration

Copy `.env.example` to `.env.local` and set the Supabase project URL and its
public publishable key. Never put service-role or secret keys in `VITE_` values.
The SDK loads separately from the main application bundle. Without these values,
local savings still work and the Account page shows that sign-in is unavailable.

Keep `VITE_AUTH_EMAIL_ENABLED=false` until custom SMTP is configured in Supabase,
email/password sign-in and email confirmation are enabled, and these redirects
are allowed in Supabase Auth URL Configuration:

- Site URL: `https://saving-app-dusky.vercel.app`
- Redirect: `https://saving-app-dusky.vercel.app/account`
- Local development redirect: `http://127.0.0.1:5173/account`

The production Site URL and `/account` redirect above were saved in Supabase on
September 7, 2026. Email sign-in, required email confirmation, and TOTP were
confirmed enabled. Gmail custom SMTP is now saved using `smtp.gmail.com:465`
and sender name Saving. The user entered the Google App Password directly into
Supabase; no SMTP credentials belong in this repository or Vercel's frontend
variables. Gmail's personal-email delivery limitations are accepted for this
small project. No application tests or test emails were run.

`VITE_AUTH_EMAIL_ENABLED=true` is set for Vercel Production. Preview and Development
remain false until their exact callback URLs are configured. The local development
redirect above is optional and has not been added. New environments should keep
the false default in `.env.example` until ready.

Add only trusted preview URLs when needed. Set `VITE_AUTH_EMAIL_ENABLED=true`
and rebuild after configuration to expose signup and password recovery. This flag
controls the UI; Supabase Auth settings control whether the server accepts signup.
Supabase's default email sender is restricted and is not a production email setup.
The recovery link returns to Account; enrolled accounts must complete TOTP before
changing their password. Ensure TOTP enrollment/verification are enabled in the
Supabase MFA settings. No application-generated recovery codes are provided;
users can enroll a second authenticator before losing their first device.

## Cloud workspace activation

The user confirmed manual application of
`supabase/migrations/20260907190000_account_workspaces.sql` in the existing
Supabase project on September 8, 2026. Production is configured with
`VITE_CLOUD_WORKSPACE_ENABLED=true`; Preview and Development remain false.
The dashboard connection timed out during the follow-up inspection, so the
live schema, grants, and policies have not been independently verified.

For a fresh project, apply this migration once through normal migration tooling
before enabling the flag and rebuilding. The existing project was migrated
manually in SQL Editor; reconcile its migration history before using CLI
migrations, and do not blindly apply the SQL twice.

With cloud storage enabled:

- Signed-out visitors keep the existing browser-local workspace. Signed-in users
  must enroll and verify Google Authenticator before using cloud savings.
- Each account owns one `public.workspaces` row containing the existing JSON
  workspace, revision, and update timestamp. Saves keep linked expenses and Main
  entries together. The database caps the JSON document at 5 MiB and checks its
  basic shape; the application validates the complete domain schema.
- Database RLS requires the owning user ID and an `aal2` JWT for select, insert,
  and update. Anonymous clients have no grants. Authenticated clients can insert
  only user ID/state and update only state; they cannot delete rows or set the
  revision, timestamp, or ownership. A trigger increments revisions on updates.
- A first-use screen offers a fresh workspace or review/confirmation of a local
  import. The import copies plans, entries, schedules, expenses, goals, and budget.
  It rechecks the reviewed local snapshot, only inserts when no cloud row exists,
  and never overwrites an existing cloud workspace. Browser data is retained.
- Local and cloud copies evolve separately. Signing out returns to the local
  copy. Cloud data is kept in an account-scoped in-memory cache, never persisted
  into localStorage. Switching accounts resets that cache and mounted forms.
- Saves use the expected revision in the update condition. A concurrent change
  triggers the existing review-and-retry flow; failed saves preserve drafts.
- Cloud reads refresh on focus/reconnection and every 30 seconds while visible.
  There is no realtime subscription, offline write queue, or automatic merge.
  A cloud error never switches saving to local storage.

Preview and Development keep cloud storage disabled unless deliberately enabled
against a migrated project. Disabling the flag restores the local interface and
does not delete cloud rows. Cloud data requires authenticator enrollment again
if the user removes their last factor.

The existing route guard remains in place, with additional MFA checks before
cloud loading. Code review, lint, and cloud-enabled production compilation were
performed; application tests, RLS behavior tests, and browser flows are skipped
at the user's request. These flows are not runtime-verified.

## Downloadable workspace backups

Open Settings and choose **Download JSON backup** to save the current workspace
as a timestamped `.json` file. This includes every plan, savings entry,
contribution schedule, expense, goal, Main selection, and monthly budget.
It works with both local and cloud workspaces without changing either copy.

The export uses the saved snapshot currently loaded in the tab, validated through
the workspace schema. Unsaved form edits and remote changes that have not loaded
are excluded. If a refresh fails, the last successfully loaded snapshot can still
be exported; it is not guaranteed to be the latest cloud revision. Example data
is clearly labelled in Settings and uses a `saving-example-` filename prefix.

The JSON envelope has `format: "saving-workspace-backup"`, `version: 1`, a UTC
ISO `exportedAt` timestamp, and `snapshot` containing `state` and `revision`.
The revision describes the exported snapshot, not a revision to force onto a
future destination. Only validated workspace fields are serialized; Supabase
sessions, passwords, authenticator secrets, and account identifiers are excluded.
The file contains financial records in plain text and is not encrypted.

Saving requests a browser download and releases its temporary object URL after
one minute. The browser controls the destination and whether the download is
accepted, so the app asks users to confirm the file in their downloads.

## Restoring a workspace backup

Use **Restore a backup** in Settings or during first-time cloud setup. Choose a
version 1 Saving backup of up to 20 MiB. The file is read on the device for review;
cloud data is written only after the user confirms the replacement. Raw workspace
JSON, malformed files, and unsupported backup versions are rejected.

Validation checks the existing workspace schema, unique record IDs and plan names,
valid override months, schedule/entry dates, and matching Main/expense links.
Independent snapshots may retain historical expense links and deleted source-plan
references. Invalid backups are rejected without modifying the destination.

The review shows the destination account or local browser, backup filename,
export time in Myanmar time, backup Main plan, example-data notices, and current
versus incoming counts and budget. A checkbox and **Replace workspace from backup**
confirm replacement of all plans, entries, schedules, overrides, expenses, goals,
and budget together. Data is not merged. Download a copy of current savings first
if you need to retain it. Account authentication settings are not restored.

Restoration uses the existing workspace commit and repository boundary with the
reviewed destination revision. The revision in the file is informational and is
never used to overwrite the destination revision. A changed destination requires
reviewing the latest workspace and checking consent again. Save failures retain
the valid review for retry; choosing another file clears the previous review.
Account changes and unmounting invalidate pending file reads and completion UI.

A successful restore opens Savings. Cloud saves still require verified MFA and
connectivity, enforce account ownership and database size limits, and retain
insert-only initialization. Restoring a cloud workspace leaves the browser-local
copy alone. Local restoration uses the existing local repository and its storage
limits. Settings restoration requires a readable destination. Unreadable local
data has the separate recovery flow below; cloud corruption repair is not included.
No application tests or browser restore flows were run.

## Recovering unreadable local savings

When browser storage returns data that cannot be parsed as a workspace, the load
error screen offers **Recover from backup**. This includes an empty stored string;
only an absent storage key opens the example workspace. Blocked storage access
and cloud errors keep their retry flow instead of offering local replacement.

Start recovery to capture the original text, optionally download it, and select a
version 1 Saving JSON backup up to 20 MiB. The existing backup validation is reused.
Review the backup filename, Myanmar export time, Main plan, record counts, budget,
and any sample-data notice. Current totals are unavailable because the destination
cannot be decoded. Recovery requires explicit replacement consent.

The dedicated local repository operation requires Web Locks and uses the same
workspace lock as normal saves. It compares the original stored string against
the reviewed string, checks that it is still unreadable, and preserves an exact
copy under a unique `saving.workspace.v1.recovery.*` key before replacing the active
workspace. It reads back the preserved string to verify it. An existing identical
copy can be reused on retry; existing preserved copies are never overwritten.

If the original changes, preservation fails, storage is full, the revision cannot
be advanced safely, or Web Locks are unavailable, recovery stops. A failed active
workspace write retains both the original and its preserved copy. Storage events
invalidate the review; queued recovery is cancelled when its screen unmounts.
The replacement gets a fresh local revision above any recoverable previous counter,
and then returns to Savings. No cloud data or authentication settings are changed.

After recovery, **Settings → Preserved local originals** lists copies on request
and downloads them as text files. The recovery screen also offers the original
download before and after replacement. These downloads are not validated backups
and may contain financial records. Preserved copies use browser storage and are
removed if site data is cleared; they are not uploaded or automatically deleted.
No browser recovery or quota/concurrency behavior tests were run in this release.

## Formatting and coding standards

```sh
npm run format        # Format source and configuration with Prettier
npm run format:check  # Check formatting without modifying files
npm run lint          # Check TypeScript, React hooks, and dependency boundaries
npm run lint:fix      # Apply available ESLint fixes
npm run typecheck     # Check strict TypeScript types
npm test              # Run domain and repository tests
npm run test:e2e      # Run setup/savings browser tests (requires Google Chrome)
npm run test:pwa      # Build and test real service-worker upgrades
npm run build         # Type-check and create a production build
npm run check         # Run formatting, lint, types, domain tests, and build
```

Prettier is pinned in `devDependencies`. Its configuration is shared by CLI and
editor use. VS Code settings enable format-on-save when the recommended Prettier
extension is installed. The historical handoff and generated files are excluded.

ESLint enforces hook rules, type-only imports, explicit null handling, and
dependency boundaries. Components access persistence through hooks. Each feature
owns its schemas, types, components, hooks, and pure utilities. Feature utilities
do not import React, SWR, or storage implementations.

Browser tests start an isolated local server on port 4173 and use temporary browser
contexts, leaving your normal browser data untouched. They cover setup validation,
reload persistence, contribution adjustments and resets, ongoing schedule
boundaries and precedence, storage failures,
two-tab conflicts, direct entry edits across months, deletion confirmation,
expense ownership, mobile overflow, and dialog keyboard focus. Screenshots are
written under `artifacts/`. Run `npm run test:e2e` separately from `npm run check`.
The shared icon component imports only the supported icons from `lucide-react`.
Keep new icons explicitly imported and add their names to the typed icon map;
avoid importing a full icon collection. The optimized main JavaScript bundle
remains below the default build warning threshold; the Supabase SDK is a separate chunk.

## External resources

- Private repository: <https://github.com/Lazy-Ass-Developers/saving-app>
- Supabase project: <https://supabase.com/dashboard/project/ujmfbmyzqkbyzjiyjnjk>

The resources were created with permission. Production is published on Vercel.
`vercel.json` selects the Vite build and supplies the SPA fallback for direct
visits to `/savings`, `/setup`, and other client routes, following the
[Vercel Vite deployment guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).
Signed-out savings stay in each visitor's browser. Authenticated cloud savings
use Supabase with account ownership and authenticator requirements. Existing
local savings are uploaded only through the explicit first-use import.

The handoff documents remain local under the existing Git ignore rules.

## App updates

Production builds check for updates when opened, when returning to the app, when
connectivity returns, and hourly while visible. Use **Check for updates** at the
bottom of the page to check manually. When **New version available** appears,
finish saving open forms, then choose **Update now**. **Later** keeps the current
version and leaves an **Update available** button for reopening the notice.
Updating one tab does not automatically reload other tabs or discard their drafts.
The update code never clears localStorage or rewrites the savings workspace.

Existing installations from before this update flow need to load this version
once: after it downloads, close all Saving tabs and installed-app windows, then
reopen the main domain. Do not clear site data to update; that includes saved
savings. Deployment URLs and the main domain have separate local workspaces.

`npm run test:pwa` serves two releases of the production build on an isolated local
origin and exercises the real generated service worker. It verifies explicit
activation, preserved savings, deferred updates, cross-tab drafts, offline reload,
failed checks, activation retry, and mobile layout. Installed iOS/Android PWA behavior
still needs device verification.
