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
Changes persist in this browser with revision-conflict protection.

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
protection. The budget applies to every month. Authentication and cloud
persistence remain unfinished.

## Project documentation

- [Agent handoff: completed work and remaining implementation](docs/IMPLEMENTATION_HANDOFF.md)
- [Architecture and dependency boundaries](docs/ARCHITECTURE.md)
- [Implementation defaults and current scope](docs/DECISIONS.md)
- [Original discussion handoff](docs/SAVING_APP_HANDOFF.md)

## Development

Use Node.js 22.19 or newer within the Node.js 22 release line. Install the exact
lockfile dependencies with `npm ci`, then start the app with `npm run dev`.

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
is approximately 428 kB before compression, below the default build warning threshold.

## External resources

- Private repository: <https://github.com/Lazy-Ass-Developers/saving-app>
- Supabase project: <https://supabase.com/dashboard/project/ujmfbmyzqkbyzjiyjnjk>

The resources were created with permission. Deployment preparation is now resumed.
`vercel.json` selects the Vite build and supplies the SPA fallback for direct
visits to `/savings`, `/setup`, and other client routes, following the
[Vercel Vite deployment guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).
This version stores data only in each visitor's browser and requires no external
credentials. It does not upload local savings data to a server.

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
