# BookMyBarber — Code quality (Fallow + TypeScript)

> **Fallow:** [Fallow](https://docs.fallow.tools/) v2.88.2 — dead code, duplication (semantic), complexity, unused types.  
> **TypeScript:** `tsc --noEmit` per app + alignment rules in [typescript-quality skill](../.agents/skills/typescript-quality/SKILL.md).  
> **Config:** [`.fallowrc.json`](../.fallowrc.json) at monorepo root (three workspaces).  
> **Last report:** 2026-06-04

Agents **must** follow [`.cursor/rules/code-quality.mdc`](../.cursor/rules/code-quality.mdc), [`.cursor/rules/typescript-quality.mdc`](../.cursor/rules/typescript-quality.mdc), [`.cursor/rules/documentation-updates.mdc`](../.cursor/rules/documentation-updates.mdc), the [Fallow skill](../.agents/skills/fallow/SKILL.md), and the [TypeScript quality skill](../.agents/skills/typescript-quality/SKILL.md) (with **`typescript-best-practices`**).

**Mandatory on every code change:** Re-run Fallow + `tsc`, then update this file (**Last report** + metrics or session note) and [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) in the same session.

**Session note (2026-06-04):** SafePay checkout fix — `safepay.service.ts` metadata `order_id` only; `schemas/payment.ts` Zod checkout; `toSafepayApiError`; bk `tsc` ✅.

**Session note (2026-06-04):** Mobile Expo Router — root `Stack` in `_layout.tsx`, `(tabs)/_layout.tsx` NativeTabs, tab screens moved under `(tabs)/`; `barber` stack header; removed deprecated `components/app-tabs*.tsx`; `tsc` ✅; Fallow mobile dead-code **36** (+1 file count from route files; deprecated re-exports removed).

**Session note (2026-06-04):** Booking slot engine — `assertSlotBookable`, `booking-time.ts`, Zod `schemas/booking.ts`, migration `shop_timezone`; mobile `use-shop-navigation`, book/bookings UX; admin bookings tab + `lib/bookings.ts`; all `tsc` ✅; Fallow bk **9** (5 types in booking schema), mobile **35**, admin **0** unused-types.

**Session note (2026-06-04):** Mobile API connectivity — added `api-config.ts`, `connectivity.ts`, `ApiConnectivityProvider`, dev connectivity banner; `tsc` pass; Fallow mobile dead-code **33** (+1 export), health **77.8** B, files **56**.

**Session note (2026-06-04):** Barber home UX + Profile tab — `dashboard-action-cards.tsx`, `profile.tsx`, `lib/profile.ts`; barber `FlatList` pull-to-refresh; backend Zod `PUT /app/profile`; mobile `tsc` ✅; Fallow mobile dead-code **31** (8 files, 14 exports, 9 types); bk dead-code **2** unused types (`schemas/profile.ts` exports).

**Session note (2026-06-04):** Location fallback + `AppDialog`/`appAlert` — customer nearby uses city center when GPS unavailable; all mobile `Alert.alert` removed; `AppDialogProvider` in `_layout.tsx`; design-system docs/rules updated; `tsc` ✅.

**Session note (2026-06-04):** Added TypeScript quality sections, `typescript-quality` skill + rule, enabled Fallow `unused-types: warn`. Baseline: all three apps pass `tsc --noEmit`; backend 0 explicit `any`; mobile ~15 `any` in 4 files. Unused types: bk **1**, admin **0**, mobile **8** (UI kit re-exports + `ShopService`).

---

## Monorepo summary

### Fallow (structure + hygiene)

| Workspace | Path | Health grade | Score | Dead-code issues | Duplication % | Clone groups |
|-----------|------|--------------|-------|------------------|---------------|--------------|
| **Backend** | `BookMyBarber-bk/` | B | 77.4 | **10** (0 files, 4 exports, **6 types**) | **12.7%** | 54 |
| **Admin** | `BookMyBarber-admin/` | B | 83.2 | **2** (2 files, 0 exports, 0 types) | **2.9%** | 9 |
| **Mobile** | `BookMyBarber-App/` | B | 77.8 | **36** (9 files, 16 exports, **11 types**) | **6.8%** | 24 |

**Cross-cutting:** No circular dependencies, boundary violations, or unused npm dependencies. Duplication uses **semantic** mode. Plugins: Vite, Vitest, ESLint, TypeScript, Tailwind, PostCSS, Expo Router, React Native, Nodemon.

### TypeScript (compiler + type hygiene)

| Workspace | `tsc --noEmit` | `strict` | Explicit `any` | Fallow unused types |
|-----------|----------------|----------|----------------|---------------------|
| **Backend** | ✅ pass | ✅ | **0** | **5** — `schemas/profile.ts`, `schemas/booking.ts` inferred exports |
| **Admin** | ✅ pass | ❌ (not in `tsconfig.app.json`) | **1** (`App.tsx`) | **0** |
| **Mobile** | ✅ pass | ✅ (Expo base) | **~15** (4 files; hotspot `index.tsx`) | **8** — UI kit re-exports + `ShopService` |

**Cross-cutting:** No `@ts-ignore` / `@ts-expect-error`. Zod on `PUT /app/profile` (`schemas/profile.ts`); extend to other bodies incrementally. Clients mirror backend DTOs in `src/lib/*` (e.g. `lib/profile.ts`); Fallow semantic dupes flag drift.

---

## TypeScript — monorepo rules

### Source of truth

```
BookMyBarber-bk  ──JSON──►  BookMyBarber-App/src/lib/*.ts
                 ──JSON──►  BookMyBarber-admin/src/lib/*.ts
```

- Backend owns API shapes (`src/services/**/types.ts`, route handlers).
- Clients **never** import backend TS (see `api-architecture.mdc`).
- When Fallow reports a **semantic dupe** on identical interfaces, treat backend as canonical and update the client mirror.

### DTO alignment map (maintain when APIs change)

| Domain | Backend (canonical) | Client mirror | Fallow dupe / notes |
|--------|---------------------|---------------|---------------------|
| Places | `src/services/maps/types.ts` — `PlacePrediction`, `PlaceDetails` | `BookMyBarber-App/src/lib/places.ts` | `dup:ecb74a08` — mobile subset omits optional backend fields (`phone`, `website`, …) |
| Shops / nearby | `/v1/app/shops/*` response shapes | `BookMyBarber-App/src/lib/shops.ts` | Type `NearbyShopParams`; shop objects still `any` in `index.tsx` — **fix when editing** |
| Bookings / services | booking routes + `assertSlotBookable` | `BookMyBarber-App/src/lib/bookings.ts`, `lib/booking-types.ts` | Shared chip UI: `barber.tsx` ↔ `book/[shopId].tsx` |
| Admin shops | `/v1/admin/*` | `BookMyBarber-admin/src/App.tsx` — local `Shop` interface | Enable `strict` + shared lib types in dedicated pass |

### Patterns (from `typescript-best-practices`)

| Pattern | Apply here |
|---------|------------|
| Discriminated unions | Async UI / fetch state in mobile screens |
| `as const` + union | `role`, booking/payment status enums |
| Zod + `z.infer` | New backend POST/PATCH validation (incremental) |
| Exhaustive `switch` | Status handlers in services |
| Typed API client | `api.get<{ place: PlaceDetails }>(…)` instead of `as PlaceDetails` |

### Anti-patterns (do not add)

- `any` on shop/booking handlers (replace with interfaces when touching the file)
- Duplicated DTO blocks without checking Fallow dupes
- `@ts-ignore` / widening to `unknown` to silence errors
- Client imports from `BookMyBarber-bk/`

---

## `.fallowrc.json` (analysis-driven)

| Setting | Purpose |
|---------|---------|
| `entry` | Per-repo roots: `BookMyBarber-bk` main + scripts, admin `main.tsx`, Expo Router `src/app/**` |
| `ignoreExportsUsedInFile` | `true` — same-file helper exports (OAuth, calendar) no longer flagged |
| `dynamicallyLoaded` | Expo config plugins + mobile `scripts/**` |
| `ignoreDependencies` | `autoprefixer`, `postcss` — Vite/Tailwind toolchain (admin) |
| `ignorePatterns` | Generated types, `dist`, `.expo`, coverage, Storybook static |
| `duplicates.mode` | `semantic` — also signals **type drift** across apps |
| `rules.unused-types` | **`warn`** — remove dead interfaces/types; trace before suppress |
| `overrides` | `*.test.*` / `*.spec.*` — unused files/exports off in tests |

---

## Refresh reports (from repo root)

### Fallow

```bash
FALLOW_AGENT_SOURCE=cursor npx fallow dead-code --format json --quiet --summary --workspace bookmybarber-bk 2>/dev/null || true
FALLOW_AGENT_SOURCE=cursor npx fallow dupes --format json --quiet --workspace bookmybarber-bk 2>/dev/null || true
FALLOW_AGENT_SOURCE=cursor npx fallow health --format json --quiet --score --workspace bookmybarber-bk 2>/dev/null || true
FALLOW_AGENT_SOURCE=cursor npx fallow dead-code --format json --quiet --unused-types --workspace bookmybarber-bk 2>/dev/null || true

FALLOW_AGENT_SOURCE=cursor npx fallow audit --format json --quiet --base main --changed-workspaces origin/main 2>/dev/null || true
```

Repeat with `bookmybarber-admin` / `bookmybarber-app` for touched workspaces.

### TypeScript

```bash
cd BookMyBarber-bk && npx tsc --noEmit
cd BookMyBarber-admin && npx tsc --noEmit
cd BookMyBarber-App && npx tsc --noEmit
```

Optional `any` hotspot scan (when updating TypeScript table):

```bash
rg ': any\b|as any' BookMyBarber-bk/src BookMyBarber-admin/src BookMyBarber-App/src --glob '*.{ts,tsx}' -c
```

---

## Backend (`BookMyBarber-bk`)

### Fallow health

| Metric | Value |
|--------|-------|
| Files analyzed | 52 |
| Functions above thresholds | 67 |
| Severity (critical / high / moderate) | 14 / 21 / 32 |

**Highest-risk files (max CRAP):** `booking.service.ts` (552), `availability.service.ts` (462), `google.calendar.ts` (420), `routes/v1/admin/index.ts` (420).

### TypeScript

| Metric | Value |
|--------|-------|
| `tsc --noEmit` | ✅ |
| `strict` | ✅ |
| Explicit `any` | **0** |
| Unused types (Fallow) | **1** — `AuthSignupPendingResponse` in `auth.service.ts` |

Prefer Zod on new route bodies; export DTOs from `src/services/**/types.ts` for maps, payments, bookings.

### Dead code (4 issues — warn)

**Unused exports (3):**

| File | Export |
|------|--------|
| `src/config/supabase.ts` | `getSupabasePublishable`, `getSupabaseAdmin` |
| `src/services/payment.service.ts` | `listPaymentsForUser` |

**Unused types (1):** `AuthSignupPendingResponse` — unexport if internal-only, or wire to signup route response.

### Duplication (12.7%, 54 groups)

| Fingerprint | Notes |
|-------------|-------|
| `dup:ecb74a08` | `PlaceDetails` — mobile ↔ `services/maps/types.ts` (API DTO; keep aligned) |
| `dup:cf52c3fd` / `dup:5374a494` | Env loaders — extract shared `readEnv` |

---

## Admin (`BookMyBarber-admin`)

### Fallow health

| Metric | Value |
|--------|-------|
| Files analyzed | 15 |
| Functions above thresholds | 7 |
| Severity (critical / high / moderate) | 4 / 1 / 2 |

**Highest-risk files:** `src/lib/api.ts` (CRAP 306), `src/App.tsx` (210).

### TypeScript

| Metric | Value |
|--------|-------|
| `tsc --noEmit` | ✅ |
| `strict` | ❌ not enabled in `tsconfig.app.json` |
| Explicit `any` | **1** (`App.tsx` catch) |
| Unused types (Fallow) | **0** |

**Backlog:** enable `strict: true` in `tsconfig.app.json` with a focused fix pass; move `Shop` and API types into `src/lib/types.ts`.

### Dead code (2 unused files — error)

- `src/App.css` — unused stylesheet
- `src/lib/payments.ts` — scaffold; implement SafePay via API or remove

### Duplication (2.9%, 9 groups)

Internal clones in `api.ts` / `payments.ts`; minor overlap with mobile routes.

---

## Mobile (`BookMyBarber-App`)

### Fallow health

| Metric | Value |
|--------|-------|
| Files analyzed | 56 |
| Functions above thresholds | 35 |
| Severity (critical / high / moderate) | 9 / 12 / 14 |

**Highest-risk files:** `src/app/index.tsx` (CRAP **1406**, CC 213), `auth-overlay.tsx`, `book/[shopId].tsx`.

**New modules:** `src/lib/api-config.ts`, `connectivity.ts`, `network-error.ts`; `contexts/api-connectivity.tsx`; `components/api-connectivity-banner.tsx`.

### TypeScript

| Metric | Value |
|--------|-------|
| `tsc --noEmit` | ✅ |
| `strict` | ✅ |
| Explicit `any` | **~15** in `index.tsx` (11), `book/[shopId].tsx` (2), `barber.tsx`, `bookings.tsx` |
| Unused types (Fallow) | **8** — `components/ui/index.ts` re-exports (public UI kit API; suppress or keep) + `ShopService` in `lib/bookings.ts` |

Replace `shop: any` with a `ShopSummary` / `ShopDetail` type aligned to `/v1/app/shops` JSON when refactoring `index.tsx`.

### Dead code (36 issues)

**Unused files (8):** scaffold/components not reached from Expo Router entries — e.g. `animated-icon.tsx`, `app-tabs.tsx`, `hint-row.tsx`, `web-badge.tsx`, `ui/collapsible.tsx`, `use-color-scheme.ts`, `use-theme.ts`, `scripts/prepare-brand-splash.mjs`.

**Unused exports (16):** UI kit barrel (incl. `AppDialog` re-export), theme tokens, `lib/auth.ts` / `lib/oauth.ts` helpers — trace before delete.

**Unused types (12):** UI kit + `AppDialog*` re-exports from `components/ui/index.ts`; `ShopService` in `lib/bookings.ts`; `MapLocationMode` exported from `index.tsx` — public API OK to keep.

### Duplication (6.8%, 24 groups)

Heavy overlap: `barber.tsx` ↔ `book/[shopId].tsx` — extract shared booking module **and** shared types.

---

## Recommended agent priorities

### Fallow / complexity

1. **Mobile `src/app/index.tsx`** — split screen/hooks (highest CRAP in repo).
2. **Backend** — remove or use `getSupabasePublishable` / `getSupabaseAdmin` / `listPaymentsForUser`; unexport or use `AuthSignupPendingResponse`.
3. **Admin** — delete or implement `payments.ts`; drop unused `App.css`.
4. **Env modules (bk)** — shared env reader; dedupe `authEnv` / `supabaseEnv` / `safepayEnv`.

### TypeScript / alignment

5. **Maps DTOs** — keep `places.ts` in sync with `services/maps/types.ts`; prefer typed `api.get` over `as PlaceDetails`.
6. **Mobile shop types** — replace `any` on shop handlers in `index.tsx` with interfaces from API responses.
7. **Admin strict mode** — enable `strict` + extract `src/lib/types.ts`.
8. **Backend validation** — Zod schemas for new mutating routes; infer handler types with `z.infer`.

---

## Workspaces

`bookmybarber-bk`, `bookmybarber-admin`, `bookmybarber-app` — `npx fallow workspaces`

## Agent skills & rules

| Tool | Location |
|------|----------|
| Fallow CLI/MCP | [`.agents/skills/fallow/SKILL.md`](../.agents/skills/fallow/SKILL.md) |
| TypeScript (monorepo) | [`.agents/skills/typescript-quality/SKILL.md`](../.agents/skills/typescript-quality/SKILL.md) |
| TypeScript (language) | `typescript-best-practices` (user skill) |
| Fallow rule | [`.cursor/rules/code-quality.mdc`](../.cursor/rules/code-quality.mdc) |
| TypeScript rule | [`.cursor/rules/typescript-quality.mdc`](../.cursor/rules/typescript-quality.mdc) |
