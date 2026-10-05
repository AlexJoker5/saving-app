# Saving Cloudflare Worker setup

This is Saving's dedicated Supabase connectivity proxy. Deploy it only to
`https://saving-app.apexstack-work.workers.dev`. It points to Saving's existing
Supabase project; Attendance has its own independent Worker.

The browser selects the connection before initializing Supabase Auth:

| Condition                                             | Connection                                   |
| ----------------------------------------------------- | -------------------------------------------- |
| Previous direct network failure saved in this browser | Worker immediately                           |
| Myanmar public IP or unknown country                  | Worker                                       |
| Other recognized public IP country                    | Direct Supabase                              |
| Direct network failure or timeout                     | Switch to Worker and remember the preference |
| Selected connection unavailable                       | Connection error with Retry                  |

Country comes from Vercel's IP country header. A VPN uses its exit country's
public IP. The app does not use GPS, language or timezone. The preference is
`saving-cloudflare-fallback:<original-project-hostname>`, scoped to this browser
and website origin. It has no expiry and survives sign-out. Clearing site data
clears the preference. Blocked localStorage still allows recovery in the current
page. Selecting Worker because of Myanmar/unknown country does not save a failure.

## 1. Deploy the Worker code

1. Open Cloudflare Dashboard → Workers & Pages → **saving-app**.
2. Open **Edit code**. Open this project's `cloudflare/supabase-proxy/worker.js`
   locally, select all, and copy it.
3. Replace the entire dashboard module with that code, including its default
   export. Choose **Deploy**. No npm package installation inside the dashboard
   is needed.
4. In the Worker's **Settings → Variables and Secrets**, set these text variables:

   | Name              | Value                                                                             |
   | ----------------- | --------------------------------------------------------------------------------- |
   | `SUPABASE_URL`    | `https://ujmfbmyzqkbyzjiyjnjk.supabase.co`                                        |
   | `ALLOWED_ORIGINS` | `https://saving-app-dusky.vercel.app,http://127.0.0.1:5173,http://localhost:5173` |

   The project URL is from Saving's current README. Verify it against your
   existing Vercel `VITE_SUPABASE_URL` before saving. Add any real custom website
   origins explicitly, separated by commas. Use origins only: no paths, trailing
   slash, wildcard or `/account`. Include local origins only when developing
   against this Worker.

5. Save/deploy the variable changes. Disable Workers application logs/observability
   for this proxy, especially because email verification links contain tokens in
   the query. The application code does not log request headers, queries or bodies.
   Cloudflare processes forwarded traffic as the proxy provider.

Do not put an API key, service-role key, SMTP password or account password in
Worker variables. The browser sends the existing publishable key and user token;
Supabase remains responsible for authentication and workspace RLS.

## 2. Check the Worker before deploying the frontend

Turn your VPN off and open:

<https://saving-app.apexstack-work.workers.dev/health>

Expected output after configuration:

```json
{ "ok": true, "service": "saving-app", "configured": true }
```

`configured:false` means the module is reachable but the variables need fixing.
This endpoint does not contact Supabase and does not verify sign-in. If the page
cannot open on your Myanmar connection, fix reachability before deploying the app.

Optional PowerShell checks (the second contacts the actual Supabase Auth API):

```powershell
Invoke-RestMethod 'https://saving-app.apexstack-work.workers.dev/health'
$savingPublicKey = Read-Host 'Paste the existing Supabase publishable key'
Invoke-RestMethod 'https://saving-app.apexstack-work.workers.dev/auth/v1/settings' -Headers @{ apikey = $savingPublicKey }
```

The second should return Auth settings JSON. An invalid-key response is a
configuration problem; it should not be mistaken for a network block.

## 3. Configure Vercel and deploy the frontend

In Saving's Vercel project → Settings → Environment Variables, keep the original
URL and publishable key, and add the Worker URL to **Production**:

```env
VITE_SUPABASE_URL=https://ujmfbmyzqkbyzjiyjnjk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_EXISTING_PUBLISHABLE_KEY
VITE_SUPABASE_PROXY_URL=https://saving-app.apexstack-work.workers.dev
VITE_AUTH_EMAIL_ENABLED=true
VITE_CLOUD_WORKSPACE_ENABLED=true
```

Keep the last two flags enabled only where the current database migrations,
SMTP and trusted callbacks are already configured. This proxy needs no new SQL.
The previous optional-MFA migration is still required by Saving's onboarding.

Publish these changes through your normal Git/Vercel workflow and create a new
deployment. Vite embeds these variables at build time; editing variables alone
does not update an existing deployment. Include the root `api/connectionRoute.ts`,
its shared connection modules, and `vercel.json` in the deployment. The SPA
rewrite and service worker now exclude `/api`, so the route lookup remains JSON.

Open <https://saving-app-dusky.vercel.app/api/connectionRoute> after deploying.
Expect `{"route":"worker"}` from Myanmar without a VPN, and
`{"route":"direct"}` from a recognized country such as Singapore. Query
parameters cannot override the decision. The endpoint returns no IP or country
and disables browser/CDN caching.

For local development, copy `.env.example` to `.env.local`, supply the original
project URL and publishable key, enable the flags appropriate to your configured
project, then run `npm run dev`. Plain Vite has no Vercel country endpoint and
uses Worker. Restart Vite after environment changes. If Vite selects another
port, add that exact localhost origin to `ALLOWED_ORIGINS`, or select port 5173
with `npm run dev -- --port 5173 --strictPort`.

## 4. Route new confirmation and recovery emails through Worker

API forwarding does not rewrite old emails. Default Supabase email links still
visit the original Supabase hostname, which may be blocked from Myanmar.

After the Worker is deployed and its real API check succeeds, open Saving's
Supabase Dashboard → Authentication → Email Templates. Preserve each template's
wording and styling; replace just its confirmation/reset link's `href`.

For **Confirm signup**, use:

```html
<a
  href="https://saving-app.apexstack-work.workers.dev/auth/v1/verify?token={{ .TokenHash }}&amp;type=signup&amp;redirect_to=https%3A%2F%2Fsaving-app-dusky.vercel.app%2Faccount"
  >Confirm your email</a
>
```

For **Reset password**, use:

```html
<a
  href="https://saving-app.apexstack-work.workers.dev/auth/v1/verify?token={{ .TokenHash }}&amp;type=recovery&amp;redirect_to=https%3A%2F%2Fsaving-app-dusky.vercel.app%2Faccount"
  >Reset your password</a
>
```

Keep Supabase's existing Site URL and trusted callback
`https://saving-app-dusky.vercel.app/account`. The app handles the returned
session/error fragment and recovery/MFA route guards as before. Worker accepts
email navigation without a browser API key, forwards the verification token to
Supabase, and permits redirects only to allowed app origins at `/account`.
It does not confirm an email itself, invent a session or follow redirects with
credentials. Old emails still contain their original links: request a new email
after saving templates. Local/preview emails use this production callback; adapt
the template deliberately if you need a separately trusted preview callback.

Email delivery, deployed redirect behavior, actual signup confirmation and
password recovery require manual verification using new emails. Do not publish
a reset/verification token or a complete emailed link in logs or screenshots.

## Connection recovery and saves

The SDK keeps its original project-specific auth storage key. Switching transport
does not create a second login store or rewrite financial state. The browser
probes `/auth/v1/settings` with a five-second deadline; normal requests have a
60-second network deadline. Valid HTTP authentication/permission errors retain
their usual handling. Service errors do not save a permanent direct-failure flag.

GET/HEAD reads can retry automatically through Worker after a direct network
failure. Workspace POST/PATCH saves are never automatically replayed. A lost
save response may mean the server already saved it. The app reloads the latest
workspace when possible and keeps the draft with a review/retry message. If
reloading fails, retry the connection and load the latest workspace before
retrying the form. A stable draft identity prevents an addition being recreated
under a new identity on retry. Revision filters remain part of every save.
Auth's SDK retains its own session-refresh behavior.

Mid-session connection recovery keeps existing pages/forms mounted and blocks
interaction with a connection dialog until recovery. Retry triggers workspace
read revalidation; it never queues or replays financial writes. If the latest
workspace already contains the change, close the draft rather than submit again.

## Manual verification after deployment

- With VPN off in Myanmar, use Network tools to confirm requests use this Worker
  from startup through login, workspace loading, setup and saving.
- With a Singapore VPN in a fresh browser profile, confirm direct Supabase is
  selected. Block only the original Supabase hostname in browser Network tools,
  reload, and confirm Worker fallback plus the saved preference. Remove the block
  and reload: that profile should continue using Worker, including after sign-out.
- Trigger a direct failure after opening a money/expense form. Confirm the draft
  remains. For an uncertain save, review current records before another attempt.
- Block Worker too, confirm the error/Retry state, unblock it and retry. Verify
  the existing form remains and workspace reads resume.
- Verify a wrong password produces its normal error without storing a fallback.
- Verify session refresh, new signup/email confirmation, password-reset email,
  password update, first/backup authenticator enrollment, MFA challenge/verification,
  unfinished-factor cleanup, verified-factor removal and sign-out.
- Verify two tabs reject stale revisions and do not overwrite each other's saves.
- Verify backup download/restore and direct page refreshes still work.

Storage, Realtime, OAuth and arbitrary RPC/table access are not used by the current
Saving interface and are not allowed by this Worker. Extend the allowlist deliberately
if those features are introduced. Origin restrictions are browser controls, not
authentication; non-browser requests still need Supabase authorization.

## Rebuild, checks and rollback

Maintained Worker code is under `src/` in this directory. After changing it, run
from the project root:

```powershell
npm run build:worker
npm run check
npm run test:connection
```

`build:worker` typechecks the Worker and creates one standalone `worker.js` using
the existing Vite/Prettier dependencies. No new runtime dependency is added.
Deploy the rebuilt file separately. Optional `wrangler.jsonc` identifies this
Worker and preserves dashboard variables; this task does not run deployment.

`test:connection` runs isolated Chrome browser scenarios against mocked Supabase
responses: startup retry and a saved entry whose response is lost. It verifies
draft retention, read recovery and duplicate prevention without live account access.

If a deployment fails, restore the previous Vercel deployment and previous
Cloudflare Worker version. Restore the previous Supabase email template links if
needed. Do not erase auth or financial storage as a troubleshooting step. Changing
`VITE_SUPABASE_PROXY_URL` requires a new frontend build/deployment.

Cloudflare Workers Free allows 100,000 requests/day across the account and
10 ms CPU/request. Separate Workers share this account allowance; preflights,
startup probes, retries and Saving's background reads contribute to traffic.
Forwarding does not increase Supabase quotas. Limits and reachability must be
checked against actual usage; no live deployment or ISP success is implied by
local checks.

References:

- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Supabase custom fetch](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/)
