# Fortuita Consilia

Fortuita Consilia is a small open-source writing experiment: type a message, accept the strange little cost of producing it, and decide whether it deserves to be published.

The project is intentionally simple in appearance. The interesting parts happen behind the input: a write run is issued by the server, the client records the interaction, and the server replays that interaction before accepting a message.

## Quick start

Requirements:

- Node.js 20+
- pnpm
- PostgreSQL (Supabase works well)
- A Discord OAuth application for sign-in

Install dependencies:

```bash
pnpm install
```

Create a local `.env` file from the variables below, then generate and apply the database schema:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev
```

Start the development server:

```bash
pnpm dev
```

Useful checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Environment variables

The exact names accepted by the current code are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by Prisma. |
| `AUTH_SECRET` | production | Signs Auth.js sessions. `NEXTAUTH_SECRET` is accepted as a legacy fallback. |
| `DISCORD_CLIENT_ID` | yes for Discord login | Discord OAuth client ID. `AUTH_DISCORD_ID` is accepted as a fallback. |
| `DISCORD_CLIENT_SECRET` | yes for Discord login | Discord OAuth client secret. `AUTH_DISCORD_SECRET` is accepted as a fallback. |
| `WRITE_RUN_SECRET` | production | Server-only HMAC key for write-run tokens and hashes. |
| `CRON_SECRET` | production with Vercel crons | Shared secret used to authenticate scheduled maintenance requests. |
| `NEXT_PUBLIC_SUPABASE_URL` | if realtime is used | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | if realtime is used | Public Supabase client key. |
| `NEXT_PUBLIC_SITE_URL` | production SEO | Canonical public URL, for example `https://fortuitaconsilia.online`. |
| `NEXT_PUBLIC_PERSONAL_PAGE_URL` | optional | Public maintainer/contact link shown as “Learn more” on Legal and Privacy. |
| `DISCORD_REPORT_WEBHOOK_URL` | optional | Private server-side Discord webhook receiving neutral report notifications only. |
| `MODERATOR_DISCORD_IDS` | optional | Comma-separated Discord account IDs allowed to open the moderation panel. |
| `DB_RETRY_WINDOW_MS` | optional | Database availability retry window. |

Never prefix a secret with `NEXT_PUBLIC_`. The `.env` file must stay local and must not be committed.

For Vercel, add production variables in Project Settings → Environment Variables, then redeploy. Cron variables are not retroactively injected into an already-built deployment.

## How publishing works

Publishing is a two-step server protocol:

1. `POST /api/write-run/start` creates a short-lived write run in the database.
2. The server returns a public seed and an HMAC-signed token. The client uses the seed to produce the visible writing interaction.
3. `POST /api/write-run/commit` receives the final text and the recorded operations.
4. The server verifies the signature, expiry, run ID, operation count, consumed character count, and final text by replaying the run server-side.
5. The run is claimed atomically, so it cannot be committed twice. Only then is the message stored.

The browser is therefore treated as an untrusted narrator. It can describe what happened, but the server decides whether that story is internally consistent.

## The score

Messages currently expose a small experimental metric called the **pain ratio**. It is not a quality score, a moderation score, or a measure of the author. It only describes the cost of producing the text:

```text
pain score = text length + iterations × 1.35 + consumed characters × 0.85
pain ratio  = pain score / text length
```

The ratio is shown as a compact number, with the calculation available as supporting detail. A ratio near `1.00` means that the interaction cost was close to the final text length; higher values mean more interaction was spent around the message.

The scoring system is still experimental and is **not deployed to production yet**. Its formula may change before it becomes a stable public feature. It should not be used to compare people or infer anything serious from a message.

## Security model

The security goal is modest: make the server the authority for publishing, limit cheap abuse, and avoid trusting values supplied by the browser.

- Auth.js protects account-owned operations through Discord sign-in.
- `AUTH_SECRET` signs authentication state and is server-only.
- `WRITE_RUN_SECRET` signs write-run tokens and hashes. Token signatures use HMAC-SHA-256 and are compared with a timing-safe comparison.
- Write runs expire, have bounded operation and consumption limits, and can only be committed once.
- The commit endpoint validates the JSON shape, body size, operation count, final text, and replay result.
- Commit requests are rate-limited per authenticated user.
- Public message IDs are random short IDs rather than database UUIDs.
- Cron endpoints require `Authorization: Bearer <CRON_SECRET>` and fail closed without it.
- Security headers include frame protection, MIME sniffing protection, a restrictive referrer policy, and production HSTS.
- Account export and deletion require an authenticated session.
- Reports are anonymous and rate-limited. Discord receives only a neutral notification; the reporter's account and message content stay out of the webhook.

This is protection against ordinary tampering and accidental abuse, not a claim of invulnerability. In particular, the in-memory rate limiter is not a perfect global limiter across multiple serverless instances. A larger deployment would move that state to a shared store.

## A friendly threat model

The fun part is imagining the tiny dishonest scripts someone might write:

- change `finalText` after the run;
- invent a cheaper operation history;
- replay a token twice;
- replace the seed;
- send 8,001 operations;
- call the cron URL directly;
- pretend that a browser header identifies them.

Those are useful thought experiments because each one maps to a concrete server-side check. The browser can try to tell a more flattering story; the verifier replays the boring one.

Please keep experiments in a local database or a dedicated test deployment. Do not probe the production service, attempt to recover secrets, or use the ideas above to bypass another person’s account or data. “Could this be fooled?” is a good development question; “let’s try it against production” is a different activity.

## Data and retention rules

- Messages published by an account are retained indefinitely unless the account owner deletes all their data.
- An account that has never published a message can be removed automatically after 30 days.
- An account that has published at least one message is not removed merely because it later becomes inactive.
- The cleanup cron never deletes published messages.
- Account deletion exports the account and its messages as JSON, then deletes the account and related data after confirmation.
- A report does not delete or publish a message. Report records retain the message ID, a message snapshot, the reported account ID/name, and optional context. They may be retained indefinitely in the application's moderation queue for safety and moderation.

## Anonymous reports

The flag action is available without signing in. It stores a moderation record in the database containing:

- the reported message ID;
- a snapshot of the reported message content;
- the reported account ID and public name/tag;
- optional context entered by the reporter.

The reporter's Discord account, session, and identity are not stored with the report. The server uses a request-derived identifier only for a short in-memory rate limit, so anonymous reporting does not mean unlimited reporting. The snapshot remains available to an authorized moderator even if the original message relation is later unavailable.

The webhook is a secret credential used only as a notification bell. Never put it in client code, never prefix it with `NEXT_PUBLIC_`, and rotate it immediately if it is exposed. Keep the moderation channel private and review reports rather than treating the notification as an automatic verdict.

## Scheduled jobs

`vercel.json` defines two production Vercel Cron Jobs, both daily and in UTC:

- `23:45 UTC`: records one idempotent row in `DailyUptime`.
- `03:15 UTC`: removes accounts older than 30 days that have never published a message.

Both endpoints are technically reachable as URLs, but they are not public operations: without `CRON_SECRET` they return `401` and do not touch the database.

## Routes worth knowing

| Route | Role |
| --- | --- |
| `/` | Write a new message. |
| `/message/[id]` | Public message page. |
| `/[tag]` | Public author page. |
| `/api/write-run/start` | Start a server-tracked write run. |
| `/api/write-run/commit` | Verify and publish a completed run. |
| `/api/account/export` | Download the signed-in user's data. |
| `/api/account/delete` | Delete the signed-in user's account and data. |
| `/api/messages/report` | Create an anonymous report and queue a neutral notification. |
| `/moderation` | Private moderation queue for authorized Discord accounts. |
| `/robots.txt` | Generated crawler rules. |
| `/sitemap.xml` | Generated sitemap for public static pages. |

## Deployment notes

The app is designed for Vercel with PostgreSQL/Supabase and uses the `fra1` region in `vercel.json`. Vercel Cron Jobs run on production deployments, not preview deployments. After changing environment variables or `vercel.json`, deploy again and check the Cron Jobs and Function logs in Vercel.

The project is open source. If you clone it, leave `NEXT_PUBLIC_PERSONAL_PAGE_URL` and `NEXT_PUBLIC_SITE_URL` unset until you have your own values.

## Project status

This is an evolving experiment rather than a finished security product. The UI is deliberately spare, the score is still provisional, and the most valuable future additions would be a small automated test suite around the write-run verifier, deletion rules, and API authorization.
