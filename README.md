# Saving

A React, Vite, and TypeScript project for savings, expenses, independent plans,
and goal forecasts.

**Current status:** architecture and code-quality foundation. The feature forms
and domain functions exist, but the application currently renders a minimal
placeholder at the home route, with a not-found screen for unknown URLs.
Full user journeys, authentication, and cloud persistence are not connected yet.

## Project documentation

- [Agent handoff: completed work and remaining implementation](docs/IMPLEMENTATION_HANDOFF.md)
- [Architecture and dependency boundaries](docs/ARCHITECTURE.md)
- [Implementation defaults and current scope](docs/DECISIONS.md)
- [Original discussion handoff](SAVING_APP_HANDOFF.md)

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
npm run build         # Type-check and create a production build
npm run check         # Run all quality gates
```

Prettier is pinned in `devDependencies`. Its configuration is shared by CLI and
editor use. VS Code settings enable format-on-save when the recommended Prettier
extension is installed. The historical handoff and generated files are excluded.

ESLint enforces hook rules, type-only imports, explicit null handling, and
dependency boundaries. Components access persistence through hooks. Each feature
owns its schemas, types, components, hooks, and pure utilities. Feature utilities
do not import React, SWR, or storage implementations.

## External resources

- Private repository: <https://github.com/Lazy-Ass-Developers/saving-app>
- Supabase project: <https://supabase.com/dashboard/project/ujmfbmyzqkbyzjiyjnjk>

The resources were created with permission. No deployment is planned under the
current instruction. This local foundation does not require external credentials.
