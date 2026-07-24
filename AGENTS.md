# BookMyBarber — Agent context

## Project progress (read first)

**[`docs/PROJECT_PROGRESS.md`](docs/PROJECT_PROGRESS.md)** — Full feature matrix, API list, bugs, backlog, changelog, and ops checklist.  
Agents must read it before coding and update it after shipping changes (see `.cursor/rules/project-progress.mdc`).

**[`docs/README.md`](docs/README.md)** — Doc index + quick troubleshooting table.

## Mandatory Skill Loading Protocol

**CRITICAL:** Before ANY planning, execution, or code edit, agents MUST:

1. **Identify task category** from the registry below
2. **Load ALL relevant skills** using the `skill` tool
3. **If a skill is listed but not found**, immediately report to user:
    > "Skill `[name]` is required for this task but not installed. Install with: `opencode skill install [source]`"
4. **Proceed only after skills are loaded** or user confirms to continue without

### Skill Categories & Registry

| Category              | Skills                                                                                                                                                                                                                                        | When to Load                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Expo/Mobile**       | building-native-ui, expo-router, expo-api-routes, expo-tailwind-setup, native-data-fetching, expo-cicd-workflows, expo-deployment, expo-dev-client, expo-module, expo-ui-jetpack-compose, use-dom, eas-update-insights                        | Any mobile app work            |
| **Cloudflare**        | agents-sdk, cloudflare, cloudflare-email-service, durable-objects, sandbox-sdk, web-perf, workers-best-practices, wrangler                                                                                                                    | Any Cloudflare/Workers task    |
| **Supabase/Database** | supabase, supabase-postgres-best-practices                                                                                                                                                                                                    | Any database/schema/query work |
| **Code Quality**      | fallow, fallow-review, typescript-best-practices, typescript-quality                                                                                                                                                                          | Any TS/JS code changes         |
| **Code Efficiency**   | Code review/refactoring                                                                                                                                                                                                                       |
| **UI/Design**         | impeccable, animation-vocabulary, apple-design, emil-design-eng, find-animation-opportunities, improve-animations, review-animations                                                                                                          | UI/styling/animation work      |
| **Communication**     | caveman, cavecrew, caveman-compress                                                                                                                                                                                                           | Token-efficient output         |
| **Email**             | resend                                                                                                                                                                                                                                        | Email integration tasks        |
| **Cursor Tools**      | automate, babysit, canvas, create-hook, create-rule, create-skill, create-subagent, loop, migrate-to-skills, onboard, review, review-bugbot, review-security, sdk, shell, split-to-prs, statusline, update-cli-config, update-cursor-settings | Cursor-specific workflows      |

### Skill Locations (for troubleshooting)

| Location                                  | Scope                 |
| ----------------------------------------- | --------------------- |
| `C:\BOOKMYBARBER\skills-lock.json`        | Local (project-level) |
| `C:\Users\saada\.agents\.skill-lock.json` | Global (user-level)   |
| `C:\Users\saada\.opencode\skills\`        | Global (opencode)     |
| `C:\Users\saada\.cursor\skills-cursor\`   | Global (cursor)       |
| `C:\Users\saada\.claude\skills\`          | Global (claude)       |

## Mandatory documentation updates (every change)

**Non-negotiable:** At the end of **every** session that changes application code, agents must update documentation in the same PR/session — including small fixes. See [`.cursor/rules/documentation-updates.mdc`](.cursor/rules/documentation-updates.mdc).

| File                                                   | Required action                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [`docs/code-quality.md`](docs/code-quality.md)         | Re-run Fallow; bump **Last report**; refresh metrics or add a session note               |
| [`docs/PROJECT_PROGRESS.md`](docs/PROJECT_PROGRESS.md) | Bump **Last updated**; append **Changelog**; update feature/bug/API rows when applicable |
| [`docs/README.md`](docs/README.md)                     | Update only when adding or renaming indexed docs                                         |

Do not mark work complete with code-only diffs and stale docs.

## Mandatory code quality (Fallow + TypeScript)

- **Read first:** [`docs/code-quality.md`](docs/code-quality.md) — per-app Fallow reports **and TypeScript baselines** (tsc, DTO alignment, `any` hotspots).
- **Rules (always on):** [`.cursor/rules/code-quality.mdc`](.cursor/rules/code-quality.mdc), [`.cursor/rules/typescript-quality.mdc`](.cursor/rules/typescript-quality.mdc), [`.cursor/rules/documentation-updates.mdc`](.cursor/rules/documentation-updates.mdc) — run Fallow + `tsc` before/after TS/JS work; use [`.agents/skills/fallow/SKILL.md`](.agents/skills/fallow/SKILL.md) and [`.agents/skills/typescript-quality/SKILL.md`](.agents/skills/typescript-quality/SKILL.md); trace before deletes; improve hotspots; **update `docs/code-quality.md` on every change**.
- **Config:** [`.fallowrc.json`](.fallowrc.json) at workspace root; workspaces: `bookmybarber-bk`, `bookmybarber-admin`, `bookmybarber-app`; `unused-types: warn`.

## Project folders (each has its own git repo)

| Role            | Folder                | Stack                                                                                      |
| --------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| Backend API     | `BookMyBarber-bk/`    | Express 5, `type: commonjs`, TS strict, Zod — `src/index.ts` entry, emits to `dist/`       |
| Admin dashboard | `BookMyBarber-admin/` | Vite + React 19 + Tailwind v4 + Recharts — `src/main.tsx` entry                            |
| Mobile app      | `BookMyBarber-App/`   | Expo 55 (not Expo Go), expo-router, NativeWind v4, Moti, MapLibre RN — `src/app/**` routes |

- Do not use `backend/` or `admin-dashboard/`.
- Root is **not** a git repo. It has an umbrella meta-repo toggled by `scripts/repo-mode.sh` (status / `mono` / `inner`). In `inner` mode the three folders are real git repos; in `mono` mode root becomes `.git` and the inners become `.git-inner`. If you see `.git-umbrella` or `*.git-inner`, run `bash scripts/repo-mode.sh status` before any git operation.
- Mobile-only context: [`BookMyBarber-App/AGENTS.md`](BookMyBarber-App/AGENTS.md) → read Expo v55 docs at https://docs.expo.dev/versions/v55.0.0/ before writing mobile code.

### Mobile UI stack

New mobile UI work uses **Expo Router + NativeWind v4 + Moti + expo-haptics/blur** with shared primitives in `BookMyBarber-App/src/components/ui/`. See [`.cursor/rules/mobile-ui-stack.mdc`](.cursor/rules/mobile-ui-stack.mdc).

### Design system (mobile + admin)

**Elegant Terracotta** — Playfair Display headings, Inter body, semantic colors (`bg-primary`, `bg-background`, `bg-sidebar`, etc.). Full spec: [`docs/design-system/elegant-terracotta.md`](docs/design-system/elegant-terracotta.md). Rules: [`.cursor/rules/design-system.mdc`](.cursor/rules/design-system.mdc). Validate UI: `node .cursor/skills/design-system/scripts/validate-design-tokens.mjs` (skill: [`.cursor/skills/design-system/SKILL.md`](.cursor/skills/design-system/SKILL.md)).

## Architecture (mandatory)

```
Mobile / Admin  →  BookMyBarber-bk (Express)  →  Supabase (Postgres + Storage only)
Mobile / Admin  →  BookMyBarber-bk (Express)  →  SafePay (payments)
```

- All database access goes through the backend (`getSupabaseSecret()`).
- **No Supabase Auth** — local JWT access tokens + bcrypt-hashed refresh rows in `public.refresh_sessions`.
- User identity and RBAC: `public.profiles` (`role`, `password_hash`, `google_sub`, `microsoft_oid`).
- All payments go through SafePay via the backend (`@sfpy/node-core`) — **no Stripe**.
- Supabase **secret key only** in `BookMyBarber-bk/.env` (not publishable/anon for auth).
- SafePay keys live only in `BookMyBarber-bk/.env`.
- Clients use Axios only (`src/lib/api.ts`, `src/lib/auth.ts`, `src/lib/payments.ts`).
- Never add `@supabase/supabase-js`, `stripe`, or SafePay SDK to client apps.
- Every protected backend route uses `authenticate` + `authorize(...roles)`.
- Roles: `customer`, `barber`, `admin` (stored in `public.profiles.role`, signed into access JWT).

### OAuth flows (do not mix)

| Purpose                         | Routes                                                               | Notes                                                |
| ------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| **Login — Google**              | `POST /v1/auth/google`                                               | Mobile sends `idToken`; backend verifies             |
| **Login — Microsoft**           | `GET /v1/auth/microsoft/connect`, `POST /v1/auth/microsoft/exchange` | Login scopes only; redirect `bookmybarberapp://auth` |
| **Calendar — Google/Microsoft** | `/v1/calendar/*`                                                     | Barber calendar sync; separate scopes and callbacks  |

See `.cursor/rules/api-architecture.mdc`, `.cursor/rules/project-progress.mdc`, and `.cursor/skills/safepay/SKILL.md`.

## Quick start

```bash
cd BookMyBarber-bk && npm run dev      # Express on :5000
cd BookMyBarber-admin && npm run dev   # Vite on :5173, proxies /v1 → :5000
cd BookMyBarber-App && npm start        # Expo dev client (not Expo Go)
```

Apply DB migrations: Supabase MCP `apply_migration` or `npm run db:migrate` in `BookMyBarber-bk`.

## Commands (typecheck / lint / quality)

**No test runner or test files exist in any app.** Don't hunt for `*.test.ts` suites — there are none yet.

| App                  | Typecheck                                  | Lint                           | Notes                                                          |
| -------------------- | ------------------------------------------ | ------------------------------ | -------------------------------------------------------------- |
| `BookMyBarber-bk`    | `npm run build` (= `tsc`, emits `dist/`)   | none                           | `tsc` is the only TS gate; run before every commit             |
| `BookMyBarber-admin` | `npm run build` (= `tsc -b && vite build`) | `npm run lint`                 | ESLint flat config (`eslint.config.js`), `tsc -b` project refs |
| `BookMyBarber-App`   | `expo lint` (TS-aware)                     | `npm run lint` (= `expo lint`) | `tsconfig.json` ~5.9; dev build required (`--dev-client`)      |

**Fallow (mandatory before/after TS/JS work):** run from workspace **root** with `npx fallow dead-code --format json --quiet 2>/dev/null \|\| true`. Workspaces: `bookmybarber-bk`, `bookmybarber-admin`, `bookmybarber-app`. Config: [`.fallowrc.json`](.fallowrc.json).

**Design token validation** (mobile + admin): `npm run validate:design` in `BookMyBarber-admin` or `BookMyBarber-App` (runs `node ../.cursor/skills/design-system/scripts/validate-design-tokens.mjs src`).

## API surface

### Public

- `GET /v1/health`
- `POST /v1/auth/login`, `/register`, `/refresh`
- `POST /v1/auth/google` — `{ idToken }`
- `GET /v1/auth/microsoft/connect`, `POST /v1/auth/microsoft/exchange`
- `POST /v1/auth/verify-email`, `/resend-verification`, `/forgot-password`, `/verify-reset-code`, `/reset-password`
- Phone/OTP auth — removed (not implemented)
- `POST /v1/webhooks/safepay`

### Authenticated (Bearer `bmb_access_token`)

- `GET /v1/auth/me`, `POST /v1/auth/logout` (body: `refresh_token` to revoke)
- `POST /v1/payments/checkout`, `GET /v1/payments/:tracker`
- `/v1/app/*` — role-scoped per route
- `/v1/admin/*` — `admin` role only
- `/v1/calendar/*` — barber calendar (separate from login OAuth)

## Auth env

### Backend (`BookMyBarber-bk/.env`)

```env
JWT_ACCESS_SECRET=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30
GOOGLE_CLIENT_ID=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_AUTH_REDIRECT_URI=bookmybarberapp://auth
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
SMTP_USER=...                        # nodemailer Gmail SMTP (verification + password reset)
SMTP_PASS=...
SMTP_FROM=...                        # optional; defaults to SMTP_USER
GEMINI_API_KEY=...                   # AI chat / assistant (see PROJECT_PROGRESS)
CORS_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:19006
CORS_RELAX_DEV=true                  # also allows localhost + ngrok browser origins when true
```

Optional map helpers: `GEOAPIFY_API_KEY`, `ORS_API_KEY`, `GRAPHHOPPER_API_KEY`, `SHOPS_RADIUS_KM_DEFAULT`, `SHOPS_RADIUS_KM_MAX`, `MAPS_PROVIDER_CACHE_TTL_MS`. Calendar OAuth uses separate `*_CALENDAR_*` vars (see `.env.example`).

Seed admin:

```bash
cd BookMyBarber-bk && npm run seed:admin -- admin@example.com 'password'
```

### Mobile (`BookMyBarber-App/.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/v1
EXPO_PUBLIC_MAPTILER_API_KEY=...   # MapLibre map tiles (https://cloud.maptiler.com/) — dev build required, not Expo Go
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

### Admin (`BookMyBarber-admin/.env`)

```env
VITE_API_URL=http://localhost:5000/v1
```

Clients also persist `bmb_refresh_token` for silent session restore via `POST /v1/auth/refresh`.

## Maps helpers (backend only)

Barber shops are stored in `barber_shops` with **coordinates + formatted address**. Customers see approved shops on the map from the database.

| Provider         | Env                   | Used for                                                                  |
| ---------------- | --------------------- | ------------------------------------------------------------------------- |
| Geoapify         | `GEOAPIFY_API_KEY`    | Address autocomplete/details when barber registers shop (`/app/places/*`) |
| OpenRouteService | `ORS_API_KEY`         | Forward/reverse geocode address hints (`/app/geocode/*`); route fallback  |
| GraphHopper      | `GRAPHHOPPER_API_KEY` | Customer driving route polyline (`/app/maps/route`)                       |

Add Shop still works without Geoapify/ORS keys: barber sets map pin + types address manually.

## SafePay env (backend only)

```env
SAFEPAY_SECRET_KEY=sec_...
SAFEPAY_MERCHANT_API_KEY=...
SAFEPAY_ENV=sandbox
SAFEPAY_WEBHOOK_SECRET=...
SAFEPAY_REDIRECT_URL=http://localhost:5173/payment/complete
SAFEPAY_CANCEL_URL=http://localhost:5173/payment/cancel
```
