# BookMyBarber Design System

**Elegant Terracotta** — warm editorial palette with Playfair Display headings and Inter body/UI text.

## Files

| File | Purpose |
|------|---------|
| [elegant-terracotta.md](./elegant-terracotta.md) | Full specification (colors, typography, usage) |
| [tokens.ts](./tokens.ts) | Allowlisted hex values for validators and tooling |

## Quick rules (agents & developers)

1. **Typography**
   - Headings / page titles (22pt+): `font-heading` (Playfair Display)
   - Body, forms, buttons, labels (10–14pt): `font-body` (Inter)

2. **Colors**
   - App canvas: `bg-background` (`#FBFAF9`)
   - Cards on canvas: `bg-card` + `border-border` (avoid heavy shadows)
   - Primary CTAs only: `bg-primary text-primary-foreground` (`#E77423`)
   - Muted copy: `text-muted-foreground`
   - Errors / delete: `bg-destructive`
   - Admin sidebar: `bg-sidebar`, `text-sidebar-foreground`, active `text-sidebar-primary`

3. **Do not** add raw hex in `.tsx` files — use semantic Tailwind classes.

4. **Validate** after UI changes:
   ```bash
   node .cursor/skills/design-system/scripts/validate-design-tokens.mjs
   # or: npm run validate:design  (from BookMyBarber-App or BookMyBarber-admin)
   ```

   Legacy mobile StyleSheet screens are listed in [`validate-ignore.txt`](./validate-ignore.txt) until migrated.

## App wiring

| App | Tokens defined in |
|-----|-------------------|
| Mobile (NativeWind v4) | `BookMyBarber-App/src/global.css`, `BookMyBarber-App/tailwind.config.js` |
| Admin (Tailwind v4) | `BookMyBarber-admin/src/index.css` (`@theme`) |

## Cursor integration

- Rule: [`.cursor/rules/design-system.mdc`](../../.cursor/rules/design-system.mdc)
- Skill: [`.cursor/skills/design-system/SKILL.md`](../../.cursor/skills/design-system/SKILL.md)
