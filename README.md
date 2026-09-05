# Saving

A React, Vite, and TypeScript project for savings, expenses, independent plans,
and goal forecasts.

**Current status:** local setup and savings are connected. The home route opens
`/savings`, with a monthly breakdown, month navigation, one-month contribution
adjustments, and reset to the schedule. `/setup` replaces the labelled example
workspace with your own starting balance, monthly saving, and spending budget.
Changes persist in this browser with revision-conflict protection. Expense, plan,
and goal screens, authentication, and cloud persistence remain unfinished.

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
reload persistence, contribution adjustments and resets, storage failures,
two-tab conflicts, mobile overflow, and dialog keyboard focus. Screenshots are
written under `artifacts/`. Run `npm run test:e2e` separately from `npm run check`.
The current production build warns about a large JavaScript bundle when the shared
icon component is included; bundle optimization remains follow-up work.

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
