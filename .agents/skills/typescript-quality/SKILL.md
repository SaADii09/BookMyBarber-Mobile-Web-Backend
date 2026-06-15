---
name: typescript-quality
description: BookMyBarber TypeScript quality — strict typing, API DTO alignment across backend/admin/mobile, Zod at trust boundaries, and Fallow type checks (unused-types, semantic dupes). Load alongside typescript-best-practices on every TS/JS change. Use when adding types, API contracts, fixing any, or keeping client types aligned with BookMyBarber-bk.
license: MIT
metadata:
  author: BookMyBarber
  version: 1.0.0
---

# TypeScript quality (BookMyBarber monorepo)

Pair with **`typescript-best-practices`** (`c:\Users\saada\.claude\skills\typescript-best-practices\SKILL.md`) for language patterns. This skill adds **repo-specific** type hygiene and alignment with **Fallow**.

**Canonical tracker:** [`docs/code-quality.md`](../../../docs/code-quality.md) — TypeScript sections + Fallow metrics.  
**Agent rule:** [`.cursor/rules/typescript-quality.mdc`](../../../.cursor/rules/typescript-quality.mdc).

## When to use

- Creating or editing `.ts` / `.tsx` in `BookMyBarber-bk/`, `BookMyBarber-admin/`, or `BookMyBarber-App/`
- Adding API routes, client `lib/*` helpers, or shared DTO shapes
- Replacing `any`, `as` casts, or duplicated interfaces flagged by Fallow dupes
- Reviewing type drift between backend responses and mobile/admin consumers

## When NOT to use

- Pure config/docs with no TS/JS
- Runtime debugging (use logs/tests)
- Style/formatting (ESLint/Prettier)

## Architecture: who owns types

```
BookMyBarber-bk (source of truth for API shapes)
    │
    ├── HTTP JSON ──► BookMyBarber-App/src/lib/*.ts (client response types)
    └── HTTP JSON ──► BookMyBarber-admin/src/lib/*.ts + local interfaces
```

- **Backend** defines route payloads and service DTOs (prefer named `type` exports next to handlers or in `src/services/**/types.ts`).
- **Clients never** import backend files. Align types manually; use Fallow **semantic dupes** to detect drift.
- **No shared npm package yet** — do not add one without product approval. Prefer backend DTO + thin client mirror documented in `docs/code-quality.md`.

## Mandatory workflow (every TS/JS session)

### 1. Before coding

1. Read **`docs/code-quality.md`** — TypeScript summary + per-app sections for the workspace you touch.
2. Load **`typescript-best-practices`** (discriminated unions, branded IDs, Zod, exhaustive switch).
3. If touching API surface, grep backend route return shape and existing client type in `src/lib/`.

### 2. During implementation

Apply patterns from `typescript-best-practices`:

| Pattern | BookMyBarber use |
|---------|------------------|
| Discriminated unions | Request/async UI state (`idle` \| `loading` \| `success` \| `error`) |
| `as const` + union | Roles: `'customer' \| 'barber' \| 'admin'` — match `public.profiles.role` |
| Zod `safeParse` / `parse` | **Backend** request bodies at route trust boundaries (adopt incrementally) |
| Branded types | Domain IDs (`ShopId`, `BookingId`) in services — optional, high-value |
| Exhaustive `switch` | Status enums (`booking_status`, payment state) |

**Client API boundaries:**

```ts
// Prefer typed helper over inline `as`
const { data } = await api.get<{ place: PlaceDetails }>("/app/places/details", { params: { placeId } });
return data.place;
```

Avoid new `any`. Replace `(x: any)` with interfaces inferred from backend JSON or documented in `docs/code-quality.md` alignment table.

**When Fallow flags semantic duplication** (`dup:*` fingerprint):

1. Treat **backend** type as canonical.
2. Update client mirror to match field names/nullability.
3. If client needs a subset, use `Pick<PlaceDetails, 'placeId' | 'lat' | 'lng'>` pattern locally (document subset in comment only if non-obvious).

### 3. Analyze (with Fallow)

From monorepo root:

```bash
# TypeScript compiler (each package)
cd BookMyBarber-bk && npx tsc --noEmit 2>/dev/null || true
cd BookMyBarber-admin && npx tsc --noEmit 2>/dev/null || true
cd BookMyBarber-App && npx tsc --noEmit 2>/dev/null || true

# Fallow type hygiene (per workspace)
FALLOW_AGENT_SOURCE=cursor npx fallow dead-code --format json --quiet --unused-types --workspace <bookmybarber-bk|bookmybarber-admin|bookmybarber-app> 2>/dev/null || true

# Duplication that often means type drift
FALLOW_AGENT_SOURCE=cursor npx fallow dupes --format json --quiet --workspace <workspace> 2>/dev/null || true
```

Also run the standard Fallow trio from [`.agents/skills/fallow/SKILL.md`](../fallow/SKILL.md) (`dead-code --summary`, `dupes`, `health`).

**Config:** `.fallowrc.json` sets `unused-types: warn`. Remove dead types; do not suppress without reason.

### 4. After every change

Update **`docs/code-quality.md`** (TypeScript subsection + session note) and **`docs/PROJECT_PROGRESS.md`** per `documentation-updates.mdc`.

## Per-app compiler baseline

| App | `strict` | Extra | Notes |
|-----|----------|-------|-------|
| Backend | ✅ `tsconfig.json` | — | **0** explicit `any` — keep clean |
| Mobile | ✅ Expo base | `paths` `@/*` | Hotspot: `index.tsx` (`any` on shop handlers) |
| Admin | ❌ not in `tsconfig.app.json` | `noUnusedLocals`, `verbatimModuleSyntax` | Enable `strict` when touching admin types |

## Known alignment targets (keep in sync)

| Domain | Backend source | Client mirror | Fallow dupe |
|--------|----------------|---------------|-------------|
| Places | `src/services/maps/types.ts` | `BookMyBarber-App/src/lib/places.ts` | `dup:ecb74a08` |
| Env loaders | `src/config/*Env.ts` | — | `dup:cf52c3fd`, `dup:5374a494` |
| Booking UI | — | `barber.tsx` ↔ `book/[shopId].tsx` | extract shared types + hooks |

When extending `PlaceDetails` on the backend, update mobile `PlaceDetails` (client uses subset — extra backend fields OK).

## Improve types when safe

1. Remove unused types flagged by Fallow (`unused-types`).
2. Replace `any` in files you edit (mobile `index.tsx`, `book/[shopId].tsx`, admin `App.tsx`).
3. Add Zod schema for new **POST/PATCH** bodies in backend routes; infer handler types with `z.infer`.
4. Use discriminated unions for multi-step mobile flows instead of many optional booleans.
5. Do **not** widen types to `unknown`/`any` to silence errors — narrow with guards or fix the source.

## Do not

- Import backend TS into clients (violates `api-architecture.mdc`).
- Duplicate large DTO blocks without checking Fallow dupes first.
- Use `@ts-ignore` / `@ts-expect-error` — fix the type or the data contract.
- Skip `tsc --noEmit` because Fallow passed (Fallow does not type-check).
- Enable admin `strict` in unrelated drive-by PRs — dedicated pass with fixes.

## Related

- [Fallow skill](../fallow/SKILL.md) — dead code, dupes, complexity (not type-checking)
- [typescript-best-practices](c:\Users\saada\.claude\skills\typescript-best-practices\SKILL.md)
- [`.cursor/rules/code-quality.mdc`](../../../.cursor/rules/code-quality.mdc)
- [`.cursor/rules/api-architecture.mdc`](../../../.cursor/rules/api-architecture.mdc)
