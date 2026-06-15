# Elegant Terracotta UI Theme Specification

A professional UI theme with a warm terracotta primary accent, cream backgrounds, high-contrast dark sidebar navigation, **Playfair Display** for headings, and **Inter** for body and UI text.

---

## 1. Typography

| Token role | Font family | Usage |
|------------|-------------|--------|
| **Headings & display** | Playfair Display, serif | H1–H3, page titles, hero (22pt minimum) |
| **Body, UI & inputs** | Inter, sans-serif | Body, forms, buttons, tooltips (10–14pt) |

**Tailwind:** `font-heading`, `font-body`  
**Mobile primitives:** `AppText` with `variant="heading" | "body" | "caption" | "label"`

---

## 2. Color palette

### 2.1 Core surfaces

| Token | Hex | Usage |
|-------|-----|--------|
| `background` | `#FBFAF9` | Primary app canvas |
| `foreground` | `#14181F` | Primary text |
| `card` | `#FFFFFF` | Cards, sections |
| `card-foreground` | `#14181F` | Text on cards |
| `popover` | `#FFFFFF` | Dropdowns, overlays |
| `popover-foreground` | `#14181F` | Popover text |

### 2.2 Brand & states

| Token | Hex | Usage |
|-------|-----|--------|
| `primary` | `#E77423` | Primary CTAs, active tabs, focus ring |
| `primary-foreground` | `#FFFFFF` | Text on primary |
| `secondary` | `#F0EDEA` | Subtle backgrounds, pills |
| `secondary-foreground` | `#1F242E` | Text on secondary |
| `muted` | `#F1F0EE` | Disabled / section backgrounds |
| `muted-foreground` | `#676F7E` | Captions, placeholders |
| `accent` | `#E8EAEE` | Hover highlights |
| `accent-foreground` | `#1F242E` | Text on accent |

### 2.3 Feedback & borders

| Token | Hex | Usage |
|-------|-----|--------|
| `destructive` | `#DC2828` | Errors, delete |
| `destructive-foreground` | `#FFFFFF` | Text on destructive |
| `border` | `#E5E0DC` | Dividers, card edges |
| `input` | `#E5E0DC` | Input outlines |
| `ring` | `#E77423` | Focus ring |

### 2.4 Sidebar (admin / dark nav)

| Token | Hex | Usage |
|-------|-----|--------|
| `sidebar` | `#101318` | Sidebar background |
| `sidebar-foreground` | `#E9E6E2` | Sidebar text |
| `sidebar-primary` | `#E77423` | Active nav indicator |
| `sidebar-primary-foreground` | `#FFFFFF` | Active nav text/icon |
| `sidebar-accent` | `#21242C` | Nav hover background |
| `sidebar-accent-foreground` | `#E9E6E2` | Nav hover text |
| `sidebar-border` | `#272C35` | Sidebar dividers |
| `sidebar-ring` | `#E77423` | Sidebar focus ring |

### 2.5 Charts

| Token | Hex |
|-------|-----|
| `chart-1` | `#E77423` |
| `chart-2` | `#2A9D90` |
| `chart-3` | `#333C4D` |
| `chart-4` | `#E8C468` |
| `chart-5` | `#E76E50` |

---

## 3. Mobile layout practices

1. **Cards:** White `bg-card` on cream `bg-background`; use `border-border`, not heavy shadows.
2. **CTAs:** Terracotta `bg-primary` only for vital actions (Submit, Checkout, Create Account). Passive icons: `text-muted-foreground`.
3. **Typography:** Playfair 22pt+ for headers; Inter 10–14pt for data and controls.

---

## 3.1 Dialogs and feedback (mobile)

**Do not** use React Native `Alert.alert` or browser `alert()` for user-facing messages in `BookMyBarber-App`. Use the shared dialog stack:

| Piece | Location |
|-------|----------|
| `AppDialog` | `BookMyBarber-App/src/components/ui/app-dialog.tsx` |
| `AppDialogProvider` | `BookMyBarber-App/src/contexts/app-dialog.tsx` (wrap app in `_layout.tsx`) |
| `appAlert(title, message?, buttons?, options?)` | `BookMyBarber-App/src/lib/app-alert.ts` |

**Variants:** `info`, `success`, `error`, `warning` — terracotta / destructive accents, Playfair title, Inter body, `selectable` message text.

**When to use what:**

| Situation | Pattern |
|-----------|---------|
| Blocking error, success, validation, permission | `appAlert` modal |
| Recoverable context (GPS off, using city center) | Inline `text-muted-foreground` banner on screen |
| Destructive confirm | `appAlert` with `style: 'destructive'` button |

**Buttons:** Last non-cancel action uses `PrimaryButton` (terracotta). Cancel/secondary uses bordered `HapticPressable`.

---

## 4. Implementation reference

### CSS variables (HSL) — `BookMyBarber-App/src/global.css`

See `@layer base { :root { ... } }` in the mobile app global stylesheet.

### Tailwind v4 admin — `BookMyBarber-admin/src/index.css`

See `@theme { --color-* }` block.

### Deprecated colors (do not use in new UI)

`#3c87f7`, `#2563eb`, `#1d4ed8`, `#0d0e11`, `#161719`, `#212225`, `#2e3135`

---

## 5. Semantic class cheat sheet

| Intent | Class |
|--------|--------|
| Page background | `bg-background` |
| Page title | `font-heading text-2xl text-foreground` |
| Body text | `font-body text-sm text-foreground` |
| Secondary text | `font-body text-sm text-muted-foreground` |
| Card | `bg-card border border-border rounded-2xl` |
| Primary button | `bg-primary text-primary-foreground font-body font-semibold` |
| Sidebar | `bg-sidebar text-sidebar-foreground` |
| Active nav | `text-sidebar-primary border-l-4 border-sidebar-primary` |
