M  .env.example
UU README.md
M  app/[tag]/[id]/page.tsx
M  app/[tag]/page.tsx
M  app/api/messages/[id]/route.ts
M  app/api/messages/report/route.ts
M  app/api/messages/route.ts
M  app/globals.css
M  app/message/[id]/page.tsx
M  components/message-list.tsx
D  lib/realtime/client.ts
M  lib/user-tag.ts
M  package.json
M  pnpm-lock.yaml
?? rewrite-rebase-todo.ps1
# Fortuita Consilia

Fortuita Consilia is an open-source writing experiment, built for reasons that do not necessarily need explaining.

You write a message, accept the sometimes strange cost of creating it, and then decide whether it deserves to be published.

The interface is intentionally quiet. The interesting part happens behind the input: the server creates a writing session, the browser records the actions taken, and the server replays that interaction before accepting the message.

The project is independent, a little experimental, and meant to be read, reused, and modified.

## Quick start

Requirements:

- Node.js 20 or newer;
- pnpm;
- PostgreSQL, for example Supabase;
- a Discord OAuth application for sign-in.

Install dependencies:

```bash
pnpm install
```

Create a local `.env` file using the variables listed below, then generate and apply the database schema:

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

These are the variables currently recognized by the codebase:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection URL used by Prisma. |
| `AUTH_SECRET` | production | Secret used to sign Auth.js sessions. `NEXTAUTH_SECRET` is still accepted as a legacy name. |
| `DISCORD_CLIENT_ID` | for Discord sign-in | Discord OAuth client ID. `AUTH_DISCORD_ID` is still accepted as a legacy name. |
| `DISCORD_CLIENT_SECRET` | for Discord sign-in | Discord OAuth client secret. `AUTH_DISCORD_SECRET` is still accepted as a legacy name. |
| `WRITE_RUN_SECRET` | production | Private HMAC key for writing sessions and their fingerprints. |
| `CRON_SECRET` | when scheduled tasks are enabled | Shared secret authenticating maintenance tasks. |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical public URL used for metadata, `robots.txt`, and the sitemap. |
| `NEXT_PUBLIC_PERSONAL_PAGE_URL` | optional | Public link to the maintainer's personal page. |
| `DISCORD_REPORT_WEBHOOK_URL` | optional | Server-side private webhook for neutral report notifications. |
| `MODERATOR_DISCORD_IDS` | optional | Discord IDs allowed to open the moderation area. |
| `DB_RETRY_WINDOW_MS` | optional | Database connection retry window. |
| `PORT` | optional | Local server port. Defaults to `3000`. |

A variable prefixed with `NEXT_PUBLIC_` is sent to the browser. That prefix must therefore never be used for a private key, session secret, database URL, or webhook.

The `.env` file must remain local and must not be committed.

## How publishing works

Publishing relies on a server-controlled protocol:

1. `POST /api/write-run/start` creates a temporary writing session in the database.
2. The server returns a public seed and a signed token. The seed is not a secret: it is part of the interaction sent to the browser.
3. `POST /api/write-run/commit` receives the final text and the operation history.
4. The server checks the signature, expiration, session ID, operation count, consumed character count, and final text by replaying the session.
5. The session is claimed atomically, so it cannot be published twice. The message is stored only after these checks succeed.

The browser is treated as a narrator that cannot be fully trusted. It can describe what happened; the server decides whether that story is coherent.

## The score

Messages display a small experimental metric called the **pain ratio**. It does not measure the quality of the message, its author, or its harmfulness. It only describes the cost of producing the text:

```text
pain score  = text length + iterations × 1.35 + consumed characters × 0.85
pain ratio  = pain score / text length
```

The ratio is displayed in a compact form, with the calculation details available when useful. A ratio close to `1.00` means that the interaction cost was close to the final text length. The higher it is, the more actions were required around the message.

The pain ratio is still experimental and **has not been deployed as a stabilized public feature**. Its formula may evolve; the aim is to give it a more concrete and readable form over time.

## Security model

The goal is deliberately simple: make the server authoritative for publishing, limit straightforward abuse, and never trust values supplied by the browser.

- Auth.js protects account-related operations through Discord sign-in.
- `AUTH_SECRET` signs authentication state and remains server-side.
- `WRITE_RUN_SECRET` signs writing-session tokens and fingerprints. Signatures use HMAC-SHA-256 and a timing-resistant comparison.
- Writing sessions expire, have operation and consumed-character limits, and can only be published once.
- The commit route validates the JSON structure, body size, operation count, final text, and replay result.
- Commits are rate-limited per authenticated user.
- Public message identifiers are short random IDs, separate from internal UUIDs.
- Public routes do not return an account directory. Accounts without published messages do not have a public author page.
- Feed updates go through the public API and polling; internal author UUIDs are not sent to the browser through a real-time stream.
- Scheduled-task routes require `Authorization: Bearer <CRON_SECRET>` and reject requests without that secret.
- Security headers provide, among other protections, iframe restrictions, MIME-sniffing protection, a restrictive referrer policy, and HSTS in production.
- Data export and account deletion require an authenticated session.
- Reports are anonymous and rate-limited to prevent abuse. Technical notifications do not contain the reporter's identity or the message content.

This model protects against ordinary manipulation and obvious abuse; it does not claim to make the application invulnerable. In particular, in-memory rate limiting is not a perfect global limit when the application runs on multiple instances. A larger deployment could move that state to shared storage.

## A few fun scenarios

The project lends itself to a few local experiments, as long as they are understood as process tests rather than ways to access the database:

- change a message URL: this only requests another public identifier; the server returns a public message or a generic response if the identifier does not exist;
- open the browser console or write a small script to send a fabricated `commit`: the server checks the token, session, seed, history, and final text;
- generate a long sequence and then replace `finalText` with a text of your choice: server-side replay detects the mismatch and rejects the publication;
- delete characters and write again: deletions change the visible text, but do not rewind the consumed history;
- wait for a generated sequence to happen to produce the characters you want: this is theoretically possible within the intended limits, but it is not a bypass; the text is accepted only if it actually matches the sequence;
- send 8,001 operations: the server rejects the request before publication; 8,000 is a per-session limit, not a user limit;
- call a scheduled-task route directly or provide a fake browser-controlled ID in a header: the cron secret is mandatory, and an arbitrary browser ID is not accepted as proof of identity.

These scenarios are useful because they show the boundary between changing the browser and getting a publication accepted. The client can rewrite the URL, modify its local JavaScript, or send a custom request; it can publish only what the server can replay and validate.

Experiments should stay on a local database or a dedicated test environment. Do not probe production, try to recover secrets, or attempt to bypass another person's account or data. “Could this system be fooled?” is a good development question. “Let's try it on production” is a different one.

## Data retention

- Published messages are kept indefinitely, unless their author requests complete data deletion.
- An account that has never published a message may be automatically deleted after 30 days.
- An account that has published at least one message is not deleted merely because it becomes inactive.
- Automatic cleanup never deletes published messages.
- Account deletion generates a JSON export of the account's data and messages, then deletes the account and related data after confirmation.
- A report does not delete the message. It keeps the message ID, a copy of its content, the reported account ID, its public name and tag, and the supplied context. These items may be retained indefinitely in the private moderation queue.

## Anonymous reports

The report button is available without signing in. The database stores:

- the ID of the reported message;
- a copy of its content;
- the ID of the related account, along with its public name and tag;
- any context supplied with the report.

The reporter's Discord account, session, and identity are not stored with the report. The server uses only a request-derived identifier for temporary in-memory rate limiting: anonymous does not mean unlimited.

The report snapshot remains available to an authorized moderator even if the relationship with the original message later becomes unavailable.

Any webhook is a private server-side credential. It must never be placed in client code, prefixed with `NEXT_PUBLIC_`, or shared publicly.

## Scheduled tasks

The repository configuration defines two daily tasks, run in UTC:

- `23:45 UTC`: records one idempotent daily activity row in `DailyUptime`;
- `03:15 UTC`: deletes accounts older than 30 days that have never published a message.

These routes are technically reachable by URL, but they are not public operations: without `CRON_SECRET`, they return `401` and do not touch the database.

## Useful routes

| Route | Purpose |
| --- | --- |
| `/` | Write a new message. |
| `/about` | Project overview. |
| `/message/[id]` | Public message page. |
| `/[tag]` | Public author page. |
| `/legal` | Rules and terms of use. |
| `/privacy` | Stored data and user rights. |
| `/api/write-run/start` | Create a writing session. |
| `/api/write-run/commit` | Validate and publish a completed session. |
| `/api/account/export` | Download your data. |
| `/api/account/delete` | Delete your account and data. |
| `/api/messages/report` | Report a message anonymously. |
| `/moderation` | Private moderation queue. |
| `/robots.txt` | Search-engine crawler rules. |
| `/sitemap.xml` | Public-page sitemap. |

## Official instance

This repository contains the project code and general configuration. The official public instance is available at [fortuitaconsilia.online](https://fortuitaconsilia.online).

Its main public information pages are available here:

- [About](https://fortuitaconsilia.online/about);
- [Terms of use](https://fortuitaconsilia.online/legal);
- [Privacy](https://fortuitaconsilia.online/privacy).

These texts describe the official instance, its data, and its rules. A clone of the repository can adapt them to its own operation. The official instance's database, accounts, secrets, and data are not part of this repository.

If you clone the project, provide your own values for `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_PERSONAL_PAGE_URL`.

## License and project spirit

The project is distributed under the MIT License. You can read it, reuse it, modify it, host it elsewhere, and write your own scripts around it.

Fortuita Consilia remains an evolving experiment: the interface is intentionally quiet, the verification model is readable, and the pain ratio may take a more concrete form over time.
