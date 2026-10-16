# Dronagiri Herbal

The online store for Dronagiri Herbal (Ahmedabad) — hair and skin care, sold direct to customers across India at **https://dronagiriherbal.in**. Customers browse and pay without creating an account; the owner runs the shop from her phone through the admin panel at `/admin` and, later, WhatsApp commands.

Detailed rules, architecture and decisions live in [CLAUDE.md](CLAUDE.md). Open work is in [AGENDA.md](AGENDA.md), open issues in [DISPUTE.md](DISPUTE.md), security checks in [AUDIT.md](AUDIT.md) and launch readiness in [PREPAREDNESS-REPORT.md](PREPAREDNESS-REPORT.md).

## Layout

| Path | What it is |
|---|---|
| `apps/web` | The website and admin panel — Next.js (App Router), TypeScript |
| `apps/mobile` | Placeholder for the future Expo app |
| `packages/db` | Prisma schema, migrations, seed and admin scripts |
| `packages/validators` | Zod input schemas shared by every API route |
| `packages/types` | Shared TypeScript types |

## Run it locally

Needs Node 20+, pnpm and the [Doppler CLI](https://docs.doppler.com/docs/install-cli) with access to the `dronagiriherbal-in` project. There is no `.env` file: every secret comes from Doppler.

```sh
pnpm install                      # also generates the Prisma client
doppler setup                     # choose project dronagiriherbal-in, config dev
pnpm --filter @dronagiri/web dev  # http://localhost:3000 (runs under doppler)
```

Database tasks, always against the **dev** branch of Neon:

```sh
doppler run -- pnpm --filter @dronagiri/db db:migrate       # create/apply a migration
doppler run -- pnpm --filter @dronagiri/db db:seed          # sample catalogue
doppler run -- pnpm --filter @dronagiri/db db:ensure-admin  # create or reset the admin login
doppler run -- pnpm --filter @dronagiri/db db:test-order    # Razorpay test order → /dev/pay/… link
```

Production migrations are run by hand with `prisma migrate deploy` against the `prd` config, before the code that needs them is deployed. Never change the production schema in the Neon dashboard.

## Deploying

Vercel builds every push. **The `dev` branch is production** — pushing to `dev` deploys dronagiriherbal.in; `main` deploys as a preview. Secrets are synced from Doppler into Vercel; store values raw, never in quotes.

## Services

| Service | Used for |
|---|---|
| Vercel | Hosting |
| Neon (Postgres) | Database — branches `production` and `dev` |
| Upstash Redis | Carts, rate limits, OTP codes, webhook de-duplication |
| Cloudflare | DNS, email routing, R2 storage for product images (`cdn.dronagiriherbal.in`) |
| Razorpay | Payments and refunds (test mode until KYC) |
| Meta WhatsApp Business API | OTP, order updates, marketing (with consent) |
| Resend | Email from `dronagiriherbal.in` |
| Sentry | Error alerts |
| Google Analytics 4 | Visitor analytics, loaded only after cookie consent |
| Doppler | All secrets (`dev` / `stg` / `prd`) |
