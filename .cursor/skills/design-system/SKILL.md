---
name: design-system
description: Validate BookMyBarber UI against Elegant Terracotta tokens (colors, typography). Use when editing mobile or admin UI, styling, themes, Tailwind className, fonts, or colors.
---

# Elegant Terracotta — UI validation

## Before shipping UI work

1. Read [`docs/design-system/elegant-terracotta.md`](../../../docs/design-system/elegant-terracotta.md)
2. Read [`docs/design-system/tokens.ts`](../../../docs/design-system/tokens.ts)
3. Run the validator from repo root:

```bash
node .cursor/skills/design-system/scripts/validate-design-tokens.mjs
```

Full mobile scan (legacy StyleSheet files listed in `docs/design-system/validate-ignore.txt` are skipped by default):

```bash
node .cursor/skills/design-system/scripts/validate-design-tokens.mjs BookMyBarber-App/src
```

## Validation checklist

### Colors

- [ ] No raw `#hex` in `.tsx` / `.ts` UI files (except imports of design token constants)
- [ ] No deprecated blues (`#3c87f7`, `bg-blue-600`, etc.)
- [ ] Primary actions use `bg-primary` (terracotta `#E77423`), not blue
- [ ] Muted copy uses `text-muted-foreground`
- [ ] Cards: `bg-card` on `bg-background`, `border-border` (minimal shadows)
- [ ] Admin sidebar uses `sidebar-*` tokens

### Typography

- [ ] Page titles / H1–H3: `font-heading` (Playfair Display, 22px+)
- [ ] Body, forms, buttons, tables: `font-body` (Inter, 10–14px)
- [ ] Mobile: use `AppText` or explicit `font-heading` / `font-body` classes

### Mobile stack (also see `mobile-ui-stack.mdc`)

- [ ] NativeWind `className` for new UI (no new `StyleSheet.create` blocks)
- [ ] Primary CTAs: `PrimaryButton` or `HapticPressable` with `haptic="medium"`
- [ ] User feedback: `appAlert` from `@/lib/app-alert` — **no** `Alert.alert` / `alert()`
- [ ] `rg "Alert\.alert" BookMyBarber-App/src` returns zero before merge

## Fixing violations

| Problem | Fix |
|---------|-----|
| Hardcoded hex in component | Replace with semantic Tailwind class from spec |
| Blue CTA | `bg-primary text-primary-foreground` |
| Generic `font-sans` on headings | `font-heading` |
| Dark-only admin main area | `bg-background` content + `bg-sidebar` nav |

## Token sources

| File | Role |
|------|------|
| `docs/design-system/tokens.ts` | Allowlist + deprecated list for script |
| `BookMyBarber-App/src/global.css` | Mobile CSS variables |
| `BookMyBarber-admin/src/index.css` | Admin `@theme` variables |
