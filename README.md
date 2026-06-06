# VCregistrar

![VCregistrar Banner](https://raw.githubusercontent.com/Deep-sea-lab/VCregistrar/main/public/banner.png)

A centralized authentication system built on Next.js 15 and Auth.js v5. It supports OAuth providers (GitHub, Microsoft Entra ID) and secure email/password login, with JWT-based session management, rate limiting, CSRF protection, and audit logging out of the box.

## Languages

- [English](#vcregistrar)
- [简体中文](./README.zh-CN.md)

## Features

- Multiple sign-in methods
  - GitHub OAuth 2.0
  - Microsoft Entra ID
  - Email + password (hashed with bcryptjs)
- Stateless JWT-based sessions (30 days by default)
- Data persistence with Prisma + PostgreSQL
- Edge rate limiting backed by Upstash Redis (sliding window: 20 requests per 60 seconds)
- Middleware-level route protection and rate limiting
- CSRF protection with dual Origin/Referer validation
- Security response headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection)
- Full audit log covering registration, login, logout, email verification, and OAuth events
- User dashboard: profile management, change password, change name, sign out all devices, link/unlink OAuth providers
- Gravatar avatar integration (SHA-256 hash)
- Edge-safe configuration: the middleware bundle does not import Prisma or other Node.js-only modules
- TypeScript strict mode and Tailwind CSS v4

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Authentication | Auth.js v5 (next-auth 5.0.0-beta) |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Cache / Rate Limit | Upstash Redis |
| Password Hashing | bcryptjs |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5 |

## Quick Start

### Requirements

- Node.js 18+ (20+ recommended)
- pnpm / npm / yarn / bun (the project uses bun by default; any of the others work as well)
- A running PostgreSQL instance
- (Optional) An Upstash Redis account, for production-grade rate limiting

### Installation

```bash
# Clone the repository
git clone https://github.com/Deep-sea-lab/VCregistrar.git
cd VCregistrar

# Install dependencies
bun install
# or
npm install
# or
pnpm install
```

### Configure environment variables

Create a `.env` file in the project root with the following variables:

```env
# --- Database ---
DATABASE_URL="postgresql://user:password@localhost:5432/vcregistrar"
DIRECT_URL="postgresql://user:password@localhost:5432/vcregistrar"

# --- Auth.js ---
AUTH_SECRET="generate with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# --- GitHub OAuth ---
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# --- Microsoft Entra ID ---
AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID="your-entra-id-client-id"
AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET="your-entra-id-client-secret"

# --- Upstash Redis (optional) ---
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

#### `AUTH_SECRET`

A random 32-byte string used to sign session JWTs. It is the single most important secret for production.

- Generate locally:
  ```bash
  openssl rand -base64 32
  ```
- On Vercel: open the project, go to Settings → Environment Variables, add `AUTH_SECRET`, paste the generated value into the Value field, and select all environments (Production, Preview, Development).

#### `NEXTAUTH_URL`

The canonical public origin of your deployment, used for OAuth callbacks and CSRF checks.

- Local development: `http://localhost:3000`
- Production: `https://your-domain.com` (no trailing slash)

#### `DATABASE_URL` and `DIRECT_URL`

These two variables point Prisma at your PostgreSQL database.

- `DATABASE_URL` is the runtime connection used by the deployed application.
- `DIRECT_URL` is the migration-only connection that bypasses PgBouncer; Prisma needs it when the runtime connection is pooled.

For local development, point both at the same local PostgreSQL instance:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vcregistrar"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/vcregistrar"
```

For Supabase (recommended for hosting):

1. Log in to [supabase.com/dashboard](https://supabase.com/dashboard) and open (or create) your project.
2. Go to Project Settings → Database.
3. Under Connection string, switch the tab to URI. You will see three connection strings: Direct, Transaction pooler, and Session pooler.
4. Copy the Direct connection string into `DIRECT_URL` (it has port `5432`).
5. Copy the Transaction pooler connection string into `DATABASE_URL` (it has port `6543`). See the "Production database connection" section below for the exact format.

#### `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`

OAuth credentials for the GitHub provider.

1. Open [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps → New OAuth App.
2. Set Application name to anything you like (for example `VCregistrar Dev`).
3. Set Homepage URL to your `NEXTAUTH_URL`.
4. Set Authorization callback URL to `${NEXTAUTH_URL}/api/auth/callback/github` (for example `http://localhost:3000/api/auth/callback/github`).
5. Click Register application. On the next screen, click Generate a new client secret, copy it immediately (GitHub will only show it once), and paste it into `AUTH_GITHUB_SECRET`.
6. Copy the Client ID displayed at the top of the page into `AUTH_GITHUB_ID`.

#### `AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID` and `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET`

OAuth credentials for Microsoft Entra ID.

1. Log in to the [Azure Portal](https://portal.azure.com/) and search for Microsoft Entra ID.
2. Open App registrations → New registration.
3. Set Name (for example `VCregistrar`), choose the Supported account type (typically Accounts in this organizational directory only for a single tenant), leave Redirect URI empty for now, and click Register.
4. On the Overview page, copy the Application (client) ID into `AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID`.
5. Open Certificates & secrets → Client secrets → New client secret. Add a description and an expiry, click Add, then copy the Value (not the Secret ID) into `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET`. The value is shown only once.
6. Open Authentication → Add a platform → Web. Set Redirect URI to `${NEXTAUTH_URL}/api/auth/callback/microsoft-entra-id` (for example `http://localhost:3000/api/auth/callback/microsoft-entra-id`), enable Access tokens and ID tokens under Implicit grant, then click Configure.
7. If your app is single-tenant, also set `AUTH_MICROSOFT_ENTRA_ID_ISSUER` in the project if the codebase supports it (default issuer is `https://login.microsoftonline.com/common/v2.0`).

#### `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

Used by the Edge rate limiter. Optional: when unset, rate limiting is disabled.

1. Sign in at [console.upstash.com](https://console.upstash.com/).
2. Create a new Redis database. Pick the region closest to your deployment (for example Singapore for the ap-southeast-1 Supabase pooler), choose TLS Enabled, and click Create.
3. On the database details page, scroll to REST API. Copy the `UPSTASH_REDIS_REST_URL` (for example `https://xxx-12345.upstash.io`) and the `UPSTASH_REDIS_REST_TOKEN`.
4. Paste them into `.env` (local) or your hosting provider's environment variable settings (Vercel → Settings → Environment Variables).
5. On Vercel, redeploy after changing environment variables; they only apply to new builds.


### Initialize the database

```bash
# Generate the Prisma Client
bun run db:generate

# Push the schema to the database (development)
bun run db:push

# Or run migrations (recommended for production)
bun run db:migrate
```

If you prefer pure SQL, run `prisma/init.sql`:

```bash
psql "$DATABASE_URL" -f prisma/init.sql
```

### Start the development server

```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build and run in production

```bash
bun run build
bun run start
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the development server |
| `bun run build` | Build the production bundle |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint |
| `bun run db:generate` | Generate the Prisma Client |
| `bun run db:push` | Push the schema to the database |
| `bun run db:migrate` | Run database migrations |
| `bun run db:studio` | Open Prisma Studio |

## OAuth Setup Guide

### GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App.
2. Set Homepage URL to `http://localhost:3000`.
3. Set Authorization callback URL to `http://localhost:3000/api/auth/callback/github`.
4. After creating the app, copy the Client ID and Client Secret into `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.

### Microsoft Entra ID

1. Register an application in the Azure Portal (App registrations).
2. Configure the redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`.
3. Create a client secret under Certificates & secrets.
4. Copy the Application (client) ID and the client secret into `AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID` and `AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET`.

## Project Structure

```
VCregistrar/
├── prisma/
│   ├── schema.prisma          # Prisma data model
│   └── init.sql               # Pure SQL initialization script
├── public/
│   └── oauth-demo.html        # OAuth demo page
├── src/
│   ├── app/
│   │   ├── (auth)/            # Legacy login/register route group
│   │   ├── api/               # API routes
│   │   │   ├── account/       # Account management (change password, change name, sign out all)
│   │   │   └── auth/          # Authentication API (login, register, callback, verify, signout, session)
│   │   ├── dashboard/         # User dashboard
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # Shared components (Header, dashboard panels, etc.)
│   ├── lib/                   # Utilities
│   │   ├── audit-log.ts       # Audit logging
│   │   ├── csrf.ts            # CSRF validation
│   │   ├── custom-adapter.ts  # Custom Prisma adapter
│   │   ├── gravatar.ts        # Gravatar helpers
│   │   ├── prisma.ts          # Prisma singleton
│   │   └── rate-limit.ts      # Upstash rate limiter
│   ├── auth.config.ts         # Edge-safe Auth.js config
│   ├── auth.ts                # Full Auth.js config (Node.js runtime only)
│   └── middleware.ts          # Edge middleware: route protection + rate limiting
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Security Design

### 1. Edge-safe split

The middleware runs in the Edge Runtime and cannot load Node.js-only modules such as Prisma or bcryptjs. To handle that:

- `src/auth.config.ts` only contains Edge-safe pieces: provider metadata, session/cookies/callbacks, pages, secret.
- `src/auth.ts` spreads `authConfig` and layers the Node-only bits (Prisma adapter, Credentials `authorize`) on top.
- `src/middleware.ts` instantiates `NextAuth(authConfig)` directly instead of importing `auth.ts`.

This prevents the Edge bundle from including Prisma, which would otherwise fail to build or inflate the bundle size.

### 2. Rate limiting

- Sliding-window limiter based on Upstash Redis (20 requests per 60 seconds).
- Applied by default to `/api/auth/callback` and `/api/auth/verify`.
- When Upstash is not configured, the limiter transparently allows all requests, which is convenient for local development.

### 3. CSRF protection

- POST requests are validated against `Origin` and `Referer` headers.
- The allowed source is configured via `process.env.NEXTAUTH_URL`.
- A failed check returns HTTP 403.

### 4. Security response headers

Injected globally through `next.config.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 5. OAuth account linking policy

To prevent account takeover, the OAuth sign-in flow behaves as follows:

- If the OAuth provider is already linked to a user, the sign-in is allowed.
- If the email returned by the OAuth provider already belongs to a different local account, the sign-in is rejected. The user must link the provider manually from the dashboard.

### 6. Audit logging

`src/lib/audit-log.ts` exposes a single entry point for emitting audit events. The following actions are covered:

- `REGISTRATION_ATTEMPT` / `REGISTRATION_SUCCESS` / `REGISTRATION_FAILED`
- `LOGIN_ATTEMPT` / `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `OAUTH_LOGIN_ATTEMPT` / `OAUTH_LOGIN_SUCCESS` / `OAUTH_LOGIN_FAILED`
- `EMAIL_VERIFICATION_REQUESTED` / `EMAIL_VERIFICATION_SUCCESS` / `EMAIL_VERIFICATION_FAILED`
- `LOGOUT`

Email addresses are partially masked in logs (only the first two local-part characters plus the domain are kept). In production, replace the `console.*` calls with an external logging service such as Datadog or CloudWatch.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register with email and password |
| POST | `/api/auth/login` | Sign in with email and password (returns JWT) |
| GET/POST | `/api/auth/[...nextauth]` | Auth.js handler |
| GET/POST | `/api/auth/callback/:provider` | OAuth callback (rate limited) |
| POST | `/api/auth/verify` | Email verification (rate limited) |
| POST | `/api/auth/signout` | Sign out |
| GET | `/api/auth/session` | Get the current session |
| GET | `/api/auth/avatar` | Avatar proxy |
| POST | `/api/account/change-password` | Change password |
| POST | `/api/account/change-name` | Change display name |
| POST | `/api/account/sign-out-all` | Sign out of all devices |

## Data Model

- `users` — Registered user accounts; supports both OAuth and password sign-in.
- `accounts` — OAuth provider bindings (GitHub, Microsoft Entra ID, etc.).
- `sessions` — Database session rows (the project currently uses the JWT strategy; this table is kept for compatibility).
- `verification_tokens` — Email verification tokens.

See `prisma/schema.prisma` for the full schema.

## Deployment

- Database: managed PostgreSQL (Supabase, Neon, RDS, etc.).
- Cache: Upstash Redis Serverless.
- Hosting: Vercel (preferred, optimized for Next.js) or self-hosted.

### Production checklist

Before going live, make sure to:

- Regenerate `AUTH_SECRET` and store it in the hosting provider's secret manager. Do not reuse a development value.
- Point `NEXTAUTH_URL` at the production domain (no trailing slash).
- Update OAuth provider callback URLs in GitHub and Microsoft Entra ID to match the production domain.
- Wire a production logging service into `logAudit` (replace the `console.*` calls with Datadog, CloudWatch, Axiom, etc.).
- Set `nodeLinker: "hoisted"` and pre-build Prisma in the deployment if your platform does not run `postinstall` automatically (for Vercel this is handled by the build command).

### Production database connection (Supabase pooler)

Serverless platforms such as Vercel create a new database connection for every function instance, which quickly exhausts the maximum connection limit of a managed PostgreSQL database (Supabase's free tier caps at 60). The fix is to route the runtime traffic through Supabase's built-in connection pooler (PgBouncer) and keep Prisma migrations on a direct connection.

If you encounter the error `FATAL: too many connections` after deployment, or if the application is unable to connect to the database, replace the `DATABASE_URL` with the pooler URL provided by your database provider:

```env
DATABASE_URL="postgresql://postgres.[project]:[PASSWORD]@[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[project].supabase.co:5432/postgres"
```

Notes:

- Replace `[project]` with the value shown in your Supabase dashboard URL (for example `abcdefghij` if the URL is `https://supabase.com/dashboard/project/abcdefghij`).
- Replace `[PASSWORD]` with the database password you set when creating the project (not your Supabase account password). If you forget it, reset it in Supabase → Project Settings → Database → Database password.
- The `aws-1-ap-southeast-1.pooler.supabase.com` host is the Supabase pooler in the Singapore region. If your project is in a different region, switch to the corresponding host (for example `aws-0-us-east-1.pooler.supabase.com` for the US East region). The full list is shown in Supabase → Project Settings → Database → Connection string → Transaction pooler.
- The `pgbouncer=true&connection_limit=1` query string is mandatory: it tells Prisma to use the transaction mode and to cap concurrent connections per function instance at 1. Without it, the pooler can still be saturated under load.
- The pooler port is `6543`; the direct connection port is `5432`. Make sure you do not swap the two.

How to verify the pooler is reachable after deployment:

```bash
# Replace the placeholders, then run from your local machine
psql "postgresql://postgres.[project]:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres" -c "select 1"
```

If the command returns `1`, the pooler is reachable and the deployed app should be able to connect.

### Vercel one-time setup

1. Push the project to GitHub, then import the repository in Vercel.
2. In the Vercel project settings, add every variable from the table above under Settings → Environment Variables. Use the production values (Supabase pooler URL, production OAuth credentials, production `AUTH_SECRET`).
3. Build command: `bun run db:generate && bun run build` (so Prisma Client is generated before Next.js builds). If you are not using bun, use `prisma generate && next build`.
4. After the first deployment, the database schema does not exist yet. Run migrations once from your local machine, pointing Prisma at the production direct connection:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[project].supabase.co:5432/postgres" \
   bun run db:migrate deploy
   ```
5. Redeploy on Vercel so the new environment variables take effect.


## Development Conventions

- TypeScript strict mode.
- Path alias `@/*` maps to `src/*`.
- Prisma table names use snake_case; column names are mapped explicitly with `@@map`.
- All write operations must pass CSRF and session checks.
- Edge and Node code are kept strictly separate; never import Node modules from `auth.config.ts`.

## Roadmap

- Complete the email verification flow (the `verification_tokens` table is already in place).
- 2FA / TOTP support.
- Internationalization (i18n).
- End-to-end testing with Playwright.

## License

MIT License
