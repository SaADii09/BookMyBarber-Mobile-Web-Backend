# BookMyBarber — Project Progress & Agent Context

> **Purpose:** Single source of truth for humans and AI agents working on this monorepo.  
> **Read this first** before implementing features, fixing bugs, or refactoring.  
> **Update this file on every agent code change** (features, fixes, refactors, APIs, bugs) — same session as code, per `documentation-updates.mdc`.

**Last updated:** 2026-06-15 (umbrella monorepo + reversible repo-mode toggle)  
**Maintainer:** Development team / any agent that completes a task

---

## How agents should use this document

1. **Before coding** — Skim [Quick status](#quick-status), [Architecture](#architecture-summary), the relevant [Feature matrix](#feature-matrix-by-area), and [`code-quality.md`](code-quality.md) for the app you touch.
2. **While coding** — Follow `.cursor/rules/api-architecture.mdc`, `.cursor/rules/project-structure.mdc`, `.cursor/rules/code-quality.mdc`, `.cursor/rules/typescript-quality.mdc`, and `.cursor/rules/documentation-updates.mdc` (mandatory).
3. **After every change** — Update this file (Last updated, changelog, feature/bug/API rows) **and** [`code-quality.md`](code-quality.md) (Fallow + Last report) in the same session — required even for small edits.
4. **Do not** duplicate Supabase/SafePay keys in clients. **Do not** use deprecated folders `backend/` or `admin-dashboard/`.

---

## Quick status

| Area | Completion | Notes |
|------|------------|-------|
| Database & migrations | ✅ | 6 migrations incl. `20260604120000_shop_timezone.sql` (apply on Supabase if not yet) |
| Backend API | ~90% | Auth, shops, booking, payments, calendar, AI, chat implemented |
| Mobile app (Expo) | ~75% | Auth, discovery, booking, pay, barber studio, AI, chat, support; NativeWind + Terracotta design tokens |
| Admin dashboard | ~85% | Login, stats, shops, bookings list, feedbacks; Terracotta theme |
| SafePay E2E | ~70% | Backend + mobile WebView; needs live keys + webhook registration |
| Calendar E2E | ~60% | OAuth + sync + webhooks coded; needs Google/Microsoft app registration |
| Gemini AI E2E | ~65% | API + mobile UI; needs `GEMINI_API_KEY` + storage bucket |

**Product flow (current):** Customer books → pays (SafePay) → booking stays `pending` until barber **approves** (can adjust duration/price) → optional calendar event on approve.

---

## Architecture summary

```
BookMyBarber-App (Expo)     ──HTTP──► BookMyBarber-bk (Express /v1) ──secret──► Supabase (Postgres + Storage only)
BookMyBarber-admin (Vite)   ──HTTP──► BookMyBarber-bk (Express /v1) ──secret──► Supabase (Postgres + Storage only)
BookMyBarber-bk             ──HTTP──► SafePay API (@sfpy/node-core)
BookMyBarber-bk             ──HTTP──► Geoapify / OpenRouteService / GraphHopper (barber address helpers + customer route path only)
BookMyBarber-bk             ──HTTP──► Google Calendar / Microsoft Graph (barber OAuth)
BookMyBarber-bk             ──HTTP──► Google Gemini (@google/generative-ai)
```

**Shop locations:** First-party records in `public.barber_shops` (coordinates + formatted address). Customer map markers come from the DB after admin approval — not external place listings. Geoapify/ORS assist barbers when setting location; GraphHopper (+ ORS fallback) draws the live route polyline.

| Repo folder | Stack | Port (dev) | Env prefix |
|-------------|-------|------------|------------|
| `BookMyBarber-bk/` | Node, Express 5, TypeScript | 5000 | `JWT_*`, `SUPABASE_URL` + `SUPABASE_SECRET_KEY`, `SAFEPAY_*`, `GEOAPIFY_*` / `ORS_*` / `GRAPHHOPPER_*`, `GEMINI_*`, OAuth calendar vars |
| `BookMyBarber-admin/` | React 19, Vite, Tailwind, Recharts | 5173 | `VITE_API_URL` |
| `BookMyBarber-App/` | React Native, Expo 55, expo-router, NativeWind v4, Moti, MapLibre RN | 8081 / 19006 | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MAPTILER_API_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |

**Roles** (`public.profiles.role`, signed in access JWT): `customer` | `barber` | `admin`

**Cities** (profile + shop search): `Gujranwala` | `Lahore` | `Vehari`

---

## Repository map (canonical paths)

| Concern | Backend | Mobile | Admin |
|---------|---------|--------|-------|
| HTTP client | — | `src/lib/api.ts` (`tryRestoreSession`, refresh interceptor) | `src/lib/api.ts` (`tryRestoreSession`) |
| Env bootstrap | `src/loadEnv.ts` | — | — |
| Auth | `src/routes/v1/auth.ts`, `src/services/auth.service.ts` | `src/lib/auth.ts`, `src/lib/oauth.ts`, `auth-overlay.tsx` | `src/lib/auth.ts` |
| Payments | `src/routes/v1/payments/` | `src/lib/payments.ts`, `src/app/checkout.tsx` | redirect pages only |
| Bookings | `src/routes/v1/app/bookings.ts` | `src/lib/bookings.ts`, `src/app/book/[shopId].tsx` | stats table in `App.tsx` |
| Shops | `src/routes/v1/app/index.ts` | `src/app/index.tsx` | `App.tsx` shops tab |
| Calendar | `src/routes/v1/calendar/` | `src/app/barber.tsx` | — |
| AI / Chat | `src/routes/v1/app/ai.ts`, `chat.ts` | `style-guide.tsx`, `chat.tsx` | — |
| Services layer | `src/services/*.ts` | — | — |
| Migrations | `supabase/migrations/` | — | — |

---

## Database schema (Supabase)

### Migrations (apply in order)

| File | Contents |
|------|----------|
| `20250521000000_health_pings.sql` | Health check helper table |
| `20250521100000_payments.sql` | `public.payments` |
| `20250521200000_core_tables.sql` | profiles, barber_shops, workers, working_hours, bookings, chat_rooms, chat_messages, feedbacks, ai_analyses |
| `20250522000000_booking_services_calendar.sql` | shop_services, booking extensions, calendar_*, payments FK, rejection_reason, storage bucket `haircut-portraits` |
| `20250523000000_local_auth.sql` | Decouple profiles from auth.users; password_hash, google_sub, microsoft_oid; refresh_sessions; payments FK → profiles |
| `20260602183000_shop_location_business_enrichment.sql` | Adds Google place metadata and business contact fields to `barber_shops` |

### Core tables

| Table | Purpose |
|-------|---------|
| `profiles` | User identity + RBAC role; bcrypt password; OAuth ids (`google_sub`, `microsoft_oid`) |
| `refresh_sessions` | BMB refresh tokens (bcrypt-hashed), rotation on `/auth/refresh` |
| `barber_shops` | Shop listing; `status`: pending \| approved \| rejected |
| `workers` | Specialists per shop |
| `working_hours` | Weekly schedule per shop (`day_of_week` 0–6) |
| `shop_services` | Barber-defined services (duration, price PKR) |
| `bookings` | Appointments; flexible requested/final duration & price |
| `payments` | SafePay tracker rows; optional `booking_id` FK |
| `calendar_connections` | Barber OAuth tokens (google \| microsoft) |
| `calendar_busy_blocks` | Cached external busy times for slot API |
| `chat_rooms` | Customer ↔ barber pair (unique) |
| `chat_messages` | Thread messages; `is_ai`, nullable `sender_id` |
| `ai_analyses` | Gemini haircut analysis results |
| `feedbacks` | Complaints; `target_type` shop \| app |

### Booking business rules

- **Slot engine:** `assertSlotBookable()` in `availability.service.ts` — single source for slots API, create, and approve
- **Slot duration:** `requested_duration_minutes ?? shop_services.duration_minutes`
- **Slot step:** 15 minutes; **min lead:** `BOOKING_MIN_LEAD_MINUTES` (default 30)
- **Blocking statuses:** `pending`, `approved` bookings block slots
- **Hybrid capacity:** “Any specialist” blocks whole shop; named worker blocks that worker + shop-wide (`worker_id` null) holds
- **Checks on book:** approved shop only, working hours, calendar busy blocks, overlap, not in past
- **Shop timezone:** `barber_shops.timezone` (default `Asia/Karachi`) — migration `20260604120000_shop_timezone.sql`
- **Commission:** 10% of price (`computeCommission`)
- **Payment:** On SafePay `paid`, `bookings.payment_status` → `paid` (barber can still approve/reject schedule)
- **Approve:** Barber may set `final_duration_minutes`, `final_price_pkr`; `end_time` recalculated; calendar events best-effort
- **Zod:** `POST /app/bookings`, approve/reject bodies, slots query, `GET /admin/bookings` query

---

## Feature matrix by area

Legend: ✅ Done | 🟡 Partial | ❌ Not started | 🔧 Needs ops/config

### Authentication

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Email/password register & login | ✅ bcrypt + local JWT | ✅ auth overlay | ✅ login form | ✅ |
| Email OTP verify | ❌ deferred | — | — | Backlog |
| Phone register/login | ❌ `501` | removed from UI | — | Backlog |
| Phone OTP verify | ❌ `501` | — | — | Backlog |
| Google Sign-In | ✅ idToken verify | ✅ expo-auth-session | — | 🔧 `GOOGLE_CLIENT_ID` |
| Microsoft Sign-In | ✅ OAuth exchange | ✅ WebBrowser OAuth | — | 🔧 Azure redirect URIs |
| Refresh session | ✅ `POST /auth/refresh` | ✅ `bmb_refresh_token` + 401 retry | ✅ localStorage | ✅ |
| Session / me / logout | ✅ `/me`, `/logout` (revoke refresh) | ✅ silent refresh on launch | ✅ tryRestoreSession | ✅ |
| Admin self-register blocked | ✅ | — | — | ✅ |
| Admin seed script | ✅ `npm run seed:admin` | — | — | ✅ |
| Password reset flow | ❌ | ❌ | ❌ | Backlog |

### Barber shops & discovery

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Barber register shop (pending) | ✅ `POST /app/shops` (requires address + lat/lng) | ✅ | — | ✅ |
| Admin approve/reject shop | ✅ | — | ✅ table + filters | ✅ |
| Rejection reason | ✅ column + API body | — | ✅ prompt on reject | ✅ |
| Search approved shops by city | ✅ `GET /app/shops/search` | ✅ home list | — | ✅ |
| Nearby map search by coordinates | ✅ `GET /app/shops/nearby` | ✅ map + list | — | ✅ |
| DB shop location (coords + formatted address) | ✅ `barber_shops` | ✅ map markers + address text | ✅ address + coords columns | ✅ |
| Customer live tracking + route path to shop | ✅ `GET /app/maps/route` (GraphHopper + ORS fallback) | ✅ live location + route polyline + navigation handoff | — | ✅ |
| Shop detail (workers, hours, services) | ✅ `GET /app/shops/:id` | ✅ modal + book CTA | — | ✅ |
| Barber list own shops | ✅ `GET /app/shops/my` | ✅ dashboard | — | ✅ |
| Barber update shop location | ✅ `PATCH /app/shops/:id/location` | ✅ map pin + address text | — | ✅ |
| Address autocomplete (barber setup helper) | ✅ `/app/places/autocomplete` (Geoapify) | ✅ add-shop search | — | ✅ |
| Geocode forward/reverse (address hint) | ✅ `/app/geocode/forward`, `/app/geocode/reverse` (ORS) | ✅ pin → address suggestion | — | ✅ |
| Add workers / specialists | ✅ `POST .../workers` | ✅ manage modal | — | ✅ |
| Portfolio / image uploads | ❌ | ❌ | ❌ | Backlog |
| Shop ratings & reviews | ❌ | ❌ | ❌ | Backlog |

### Booking & scheduling

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Shop services CRUD | ✅ `/shops/:id/services` | ✅ barber studio | — | ✅ |
| Working hours PUT | ✅ `/shops/:id/working-hours` | ✅ default Mon–Sat btn | — | 🟡 UI basic |
| Available slots API | ✅ `/shops/:id/slots` (Zod query) | ✅ book screen + date picker | — | ✅ |
| Unified slot validation | ✅ `assertSlotBookable` | — | — | ✅ |
| Create booking | ✅ `POST /app/bookings` (Zod + guards) | ✅ | — | ✅ |
| Customer my bookings | ✅ `GET .../mine` (+ shop coords) | ✅ cancel / pay / navigate | — | ✅ |
| Barber shop queue | ✅ `GET .../shop/:shopId` | ✅ barber studio | — | ✅ |
| Approve with final price/duration | ✅ `PATCH .../approve` | ✅ modal + conflict errors | — | ✅ |
| Reject / cancel | ✅ | ✅ customer cancel in bookings tab | — | ✅ |
| Weekly hours grid editor | ❌ | ❌ | — | Backlog |
| Worker-specific hours | ❌ | ❌ | — | Backlog |
| Email/SMS booking reminders | ❌ | ❌ | ❌ | Backlog |
| Auto-cancel unpaid after timeout | ❌ | ❌ | ❌ | Backlog |

### Payments (SafePay)

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Checkout session | ✅ `POST /v1/payments/checkout` | ✅ after book | — | ✅ |
| Poll payment status | ✅ `GET /v1/payments/:tracker` | ✅ checkout WebView | — | ✅ |
| Webhook handler | ✅ `/v1/webhooks/safepay` | — | — | 🔧 register URL |
| Booking payment sync | ✅ webhook + poll | — | — | ✅ |
| Mobile WebView checkout | — | ✅ `checkout.tsx` | — | ✅ |
| Admin redirect pages | — | — | ✅ `/payment/complete`, `/cancel` | ✅ |
| Refunds | ❌ | ❌ | ❌ | Backlog |
| Pay-after-approve option | ❌ | ❌ | ❌ | Product decision |

### Calendar (Google + Microsoft)

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Google OAuth connect | ✅ `/calendar/google/connect` | ✅ WebBrowser | — | 🔧 env keys |
| Microsoft OAuth connect | ✅ `/calendar/microsoft/connect` | ✅ | — | 🔧 env keys |
| OAuth callbacks (public) | ✅ | deep link | — | 🔧 redirect URIs |
| Manual sync | ✅ `POST /calendar/sync` | ✅ after connect | — | ✅ |
| Busy blocks in slots | ✅ | — | — | ✅ |
| Create event on approve | ✅ best-effort | — | — | 🟡 |
| Google push webhook | ✅ `/v1/webhooks/google-calendar` | — | — | 🔧 channel setup |
| Microsoft Graph webhook | ✅ `/v1/webhooks/microsoft-calendar` | — | — | 🔧 subscription |
| Token encryption at rest | ❌ plain DB | — | — | Backlog security |
| Cancel/update calendar on reject | ❌ | — | — | Backlog |

### Gemini AI & chat

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Analyze 3 portraits | ✅ `POST /app/ai/analyze` | ✅ style-guide tab | — | 🔧 GEMINI_API_KEY |
| List past analyses | ✅ `GET /app/ai/analyses` | ❌ | — | 🟡 |
| Chat rooms | ✅ GET/POST `/app/chat/rooms` | ✅ chat tab | — | ✅ |
| Messages | ✅ GET/POST `.../messages` | ✅ | — | ✅ |
| AI reply in chat | ✅ `POST .../ai` | ✅ AI button | — | 🔧 API key |
| Storage bucket portraits | ✅ migration | — | — | 🔧 apply migration |
| In-app camera (3 angles) | — | 🟡 picker only | — | Backlog |
| Barber AI suggestions in chat | ❌ | ❌ | — | Backlog |

### Admin dashboard

| Feature | Backend | Mobile | Admin | Status |
|---------|---------|--------|-------|--------|
| Dashboard stats | ✅ real monthly aggregation | — | ✅ | ✅ |
| Revenue/commission/bookings chart | ✅ | — | ✅ + bookings line | ✅ |
| Recent bookings table | ✅ | — | ✅ | ✅ |
| Shop verification table + filters | ✅ | — | ✅ | ✅ |
| Feedbacks table + filters | ✅ | — | ✅ | ✅ |
| Resolve feedback | ✅ | — | ✅ modal | ✅ |
| Split App into page components | — | — | ❌ monolith `App.tsx` | Backlog |
| Admin booking list + filters | ✅ `GET /admin/bookings` | — | ✅ Bookings tab | ✅ |

### Mobile app screens (expo-router)

| Route / tab | Role | Status |
|-------------|------|--------|
| `index` (Home) | customer / barber | ✅ barber: action cards + pull-to-refresh; customer: GPS fallback → city center for nearby |
| `profile` | customer / barber | ✅ GET/PUT `/app/profile`, sign out |
| `book/[shopId]` | customer | ✅ date picker, closed-day hint, typed API |
| `checkout` | customer | ✅ |
| `bookings` | customer | ✅ cancel, pay retry, track/navigate to shop |
| `barber` (studio) | barber | ✅ stack push from Home Studio card; inbox + approve |
| `(tabs)/*` | all | ✅ NativeTabs under root Stack; push routes: `barber`, `checkout`, `book` |
| `style-guide` | customer | ✅ |
| `chat` | customer / barber | ✅ |
| `explore` (Support / feedback) | all | ✅ |
| `explore` template removed | — | ✅ replaced |

---

## API reference (v1)

Base URL: `http://localhost:5000/v1` (dev)

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| POST | `/auth/login` | Email + bcrypt login |
| POST | `/auth/register` | Email register (instant session) |
| POST | `/auth/refresh` | Rotate refresh → new access JWT |
| POST | `/auth/google` | Google idToken |
| GET | `/auth/microsoft/connect` | Microsoft login authUrl |
| POST | `/auth/microsoft/exchange` | Microsoft code → session |
| GET | `/auth/microsoft/callback` | Dev OAuth callback → deep link |
| POST | `/auth/register-phone` | `501` deferred |
| POST | `/auth/login-phone` | `501` deferred |
| POST | `/auth/verify-email` | `501` deferred |
| POST | `/auth/verify-phone` | `501` deferred |
| POST | `/webhooks/safepay` | SafePay (raw body) |
| POST | `/webhooks/google-calendar` | Google push |
| POST | `/webhooks/microsoft-calendar` | MS Graph |
| GET | `/calendar/google/callback` | OAuth callback |
| GET | `/calendar/microsoft/callback` | OAuth callback |

### Authenticated (Bearer `bmb_access_token`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/auth/me` | any | Current user |
| POST | `/auth/logout` | any | Revoke refresh token (body `refresh_token`) |
| GET/PUT | `/app/profile` | customer, barber | Profile |
| POST | `/app/shops` | barber | Register shop |
| GET | `/app/shops/my` | barber | Own shops |
| GET | `/app/shops/search` | customer, barber | By city |
| GET | `/app/shops/nearby` | customer, barber | Nearby approved shops by coordinates |
| GET | `/app/maps/route` | customer, barber | Driving route path (GraphHopper primary, ORS fallback) |
| GET | `/app/geocode/forward` | customer, barber | ORS forward geocode for address text |
| GET | `/app/geocode/reverse` | customer, barber | ORS reverse geocode for map pin address hint |
| GET | `/app/shops/:id` | customer, barber | Detail + services (customers: approved shops only) |
| PATCH | `/app/shops/:id/location` | barber | Update owned shop location/coordinates |
| POST | `/app/shops/:id/workers` | barber | Add worker |
| GET/POST/PATCH/DELETE | `/app/shops/:id/services` | barber / read | Services |
| PUT | `/app/shops/:id/working-hours` | barber | Replace hours |
| GET | `/app/shops/:id/slots` | customer, barber | Availability |
| POST | `/app/bookings` | customer | Create booking |
| GET | `/app/bookings/mine` | customer | List |
| GET | `/app/bookings/shop/:shopId` | barber | Queue |
| PATCH | `/app/bookings/:id/approve` | barber | Approve |
| PATCH | `/app/bookings/:id/reject` | barber | Reject |
| PATCH | `/app/bookings/:id/cancel` | customer, barber | Cancel |
| POST | `/payments/checkout` | customer | SafePay URL |
| GET | `/payments/:tracker` | customer, barber, admin | Status |
| GET | `/calendar/connections` | barber | List connections |
| GET | `/calendar/google/connect` | barber | Auth URL |
| GET | `/calendar/microsoft/connect` | barber | Auth URL |
| POST | `/calendar/sync` | barber | Pull busy blocks |
| DELETE | `/calendar/connections/:provider` | barber | Disconnect |
| GET | `/app/places/autocomplete` | customer, barber | Geoapify address autocomplete (barber shop setup helper) |
| GET | `/app/places/details` | customer, barber | Geoapify place details for selected address |
| POST | `/app/ai/analyze` | customer | Multipart 3 images |
| GET | `/app/ai/analyses` | customer | History |
| GET/POST | `/app/chat/rooms` | customer, barber | Rooms |
| GET/POST | `/app/chat/rooms/:id/messages` | customer, barber | Messages |
| POST | `/app/chat/rooms/:id/ai` | customer, barber | AI reply |
| POST | `/app/feedbacks` | customer, barber | Submit ticket |

### Admin only (`admin` role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard/stats` | Counts + graphData + recentBookings |
| GET | `/admin/bookings` | List bookings (`status`, `shopId`, `from`, `to`, `limit`) |
| GET | `/admin/shops` | All shops |
| POST | `/admin/shops/:id/approve` | Approve |
| POST | `/admin/shops/:id/reject` | Reject (+ rejectionReason) |
| GET | `/admin/feedbacks` | All feedbacks |
| POST | `/admin/feedbacks/:id/resolve` | Resolve (+ resolutionNotes) |

---

## Environment variables checklist

### BookMyBarber-bk `.env`

```env
PORT=5000

# Local JWT auth (required)
JWT_ACCESS_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30
GOOGLE_CLIENT_ID=
GEOAPIFY_API_KEY=
ORS_API_KEY=
GRAPHHOPPER_API_KEY=
SHOPS_RADIUS_KM_DEFAULT=10
SHOPS_RADIUS_KM_MAX=50
MAPS_PROVIDER_CACHE_TTL_MS=60000
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
MICROSOFT_AUTH_REDIRECT_URI=bookmybarberapp://auth
MICROSOFT_AUTH_CALLBACK_URI=http://localhost:5000/v1/auth/microsoft/callback

# Supabase — DB/storage only (no Supabase Auth)
SUPABASE_URL=
SUPABASE_SECRET_KEY=

SAFEPAY_SECRET_KEY=
SAFEPAY_MERCHANT_API_KEY=
SAFEPAY_ENV=sandbox
SAFEPAY_WEBHOOK_SECRET=
SAFEPAY_REDIRECT_URL=http://localhost:5173/payment/complete
SAFEPAY_CANCEL_URL=http://localhost:5173/payment/cancel
CORS_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:19006
GEMINI_API_KEY=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:5000/v1/calendar/google/callback
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
MICROSOFT_CALENDAR_REDIRECT_URI=http://localhost:5000/v1/calendar/microsoft/callback
MOBILE_CALENDAR_REDIRECT=bookmybarber://calendar-connected
PLACES_RADIUS_KM_DEFAULT=10
PLACES_RADIUS_KM_MAX=50
```

### Clients

- **Mobile:** `EXPO_PUBLIC_API_URL=http://localhost:5000/v1` (emulator/simulator)
  - **Google Sign-In:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (same Web client as backend `GOOGLE_CLIENT_ID`)
  - **Microsoft Sign-In:** Azure redirect `bookmybarberapp://auth` (scheme in `app.json`)
  - **Physical device:** use PC LAN IP, e.g. `http://192.168.x.x:5000/v1` — must be `http://` (two slashes), not `http:/`
  - Restart Expo after `.env` change: `npx expo start -c`
- **Admin:** `VITE_API_URL=http://localhost:5000/v1`
- **Admin seed:** `cd BookMyBarber-bk && npm run seed:admin -- admin@example.com 'password'`

### Mobile dev networking (not CORS)

- **Android/iOS native HTTP does not use browser CORS.** If the backend logs `GET /v1/... 401`, the request reached the server.
- **App-open health check:** On every launch (guest or logged in), mobile calls `GET /v1/health` via `ApiConnectivityProvider` — expect this in backend/ngrok logs before sign-in.
- **401 with 73-byte body** = no `Authorization: Bearer` header (not logged in yet).
- **401 with 58-byte body** = token sent but invalid/expired → sign in again or clear app storage.
- **Network Error** on device = wrong `EXPO_PUBLIC_API_URL`, backend not running, or firewall — not CORS.
- **CORS** only matters for **Expo Web** / admin browser; add origins to `CORS_ORIGINS` if needed. Native apps send no `Origin` and are allowed when `!origin`.

**Physical device (Expo Go) — pick one:**

| Mode | `EXPO_PUBLIC_API_URL` | Notes |
|------|------------------------|-------|
| LAN (stable) | `http://<PC_LAN_IP>:5000/v1` | Same Wi‑Fi; allow port 5000 in Windows Firewall |
| ngrok | `https://<subdomain>.ngrok-free.app/v1` | Free tier URL changes each restart — update `.env` + `npm run start:clear` |

After any `.env` change: `cd BookMyBarber-App && npm run start:clear` (or `npx expo start -c`), then reload Expo Go.

Dev auth overlay shows API URL + Connected/Unreachable status (`__DEV__` only). Metro logs prefix API calls with `[BookMyBarber API]`.

---

## Known issues & bugs

| ID | Area | Severity | Description | Workaround / fix |
|----|------|----------|-------------|------------------|
| B-001 | DB | Resolved | Migrations were not applied (empty public schema) | Applied 2026-05-21 via Supabase MCP |
| B-002 | Slots | Low | Busy blocks + hours use `barber_shops.timezone` (default Asia/Karachi); edge cases on multi-day blocks | Apply migration `20260604120000_shop_timezone.sql` |
| B-003 | Calendar | Medium | OAuth tokens stored plain text in `calendar_connections` | Encrypt at rest (backlog) |
| B-004 | Calendar | Low | Google watch channels not auto-created on connect | Manual sync works; webhook partial |
| B-005 | Mobile | Medium | Chat "new room" requires raw barber user UUID | Add barber picker from shop detail |
| B-006 | Mobile | Low | Tab icons reuse explore asset for new tabs | Add dedicated tab icons |
| B-007 | Gemini | Medium | Falls back to mock analysis if Gemini fails | Set valid `GEMINI_API_KEY` |
| B-008 | Auth | Low | `GET /auth/me` returns JWT user, not full profile | Use `GET /app/profile` for city/role |
| B-009 | Booking | Medium | No services → no slots → customer cannot book | Barber must add services + hours first |
| B-010 | Payments | High | SafePay not configured → 503 on checkout | Fill `SAFEPAY_*` in backend `.env` |
| B-021 | Payments | Resolved | Checkout 500 `unsupported meta key user_id` — invalid SafePay session metadata | **Fixed:** send `metadata.order_id` (booking UUID) only; `user_id`/`booking_id` stay in `public.payments` |
| B-011 | Mobile | Medium | Malformed `EXPO_PUBLIC_API_URL` (`http:/` vs `http://`) causes Axios Network Error | Use full URL; restart Expo with `-c` |
| B-019 | Mobile | Medium | Stale Metro bundle or rotated ngrok URL → zero backend hits on physical device | Update `.env`; `npm run start:clear`; check dev banner shows Connected + `GET /v1/health` on app open |
| B-020 | Mobile | Resolved | `router.push('/barber' \| '/checkout' \| '/book/…')` did nothing under NativeTabs-only layout (haptic only) | **Fixed:** root `Stack` in `_layout.tsx`; tab screens in `(tabs)/`; stack screens for barber, checkout, book |
| B-012 | Backend | High | Supabase showed `configured:false` at startup when keys were in `.env` | **Fixed:** `src/loadEnv.ts` + lazy env in `config/supabase.ts` |
| B-013 | Mobile | Low | Tabs prefetch protected APIs before login → uncaught 401/403 in Metro | **Fixed:** `AuthSessionProvider` gates `AppTabs` until authenticated; proactive JWT refresh in `tryRestoreSession`; bookings catches 401/403; Bookings tab hidden for non-customers |
| B-014 | Backend | High | Missing/placeholder `JWT_ACCESS_SECRET` breaks login | Set long random string in `BookMyBarber-bk/.env` |
| B-015 | Auth | Medium | OAuth sign-in needs Google/Azure app registration | Set `GOOGLE_CLIENT_ID` + mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; Azure redirects for login + calendar |
| B-016 | Auth | Low | Supabase Auth users from before migration | Re-register or run one-off profile import |
| B-017 | Mobile | High | Windows Android build: `Filename longer than 260 characters` (CMake/Ninja, New Arch) | Run `BookMyBarber-App/scripts/setup-windows-ninja.ps1`, restart PC, `gradlew clean`. Ensure `BookMyBarber-App/android/app/build.gradle` uses `-DCMAKE_OBJECT_PATH_MAX=240` (not `1024`) so CMake shortens object paths. If still failing, move repo to `C:\bmb\`. `subst` does not help (CMake still embeds real `C:\Users\...` paths). |
| B-018 | Maps | Low | Backend address helpers return `503` when `GEOAPIFY_API_KEY` / `ORS_API_KEY` missing; mobile map needs `EXPO_PUBLIC_MAPTILER_API_KEY` + dev build (`expo run:android`, not Expo Go) | Backend: Geoapify/ORS in `BookMyBarber-bk/.env`; Mobile: MapTiler key + `npx expo run:android` after `@maplibre/maplibre-react-native` |

---

## Backlog & planned improvements

### P0 — Required for production pilot

- [x] Apply all Supabase migrations on project `narmnxkgxohrcvpzonid` (incl. `local_auth` 2026-05-21)
- [ ] Configure SafePay sandbox + production webhooks
- [ ] Register Google Cloud + Microsoft Entra OAuth apps
- [ ] Set `GEMINI_API_KEY` and test portrait upload bucket
- [ ] E2E test: register → book → pay → barber approve

### P1 — UX & reliability

- [x] Migrate mobile screens from `StyleSheet` to NativeWind (`home-ui`, `ui-classes`; `validate-ignore.txt` cleared)
- [ ] Weekly working-hours grid (mobile barber studio)
- [ ] Barber Studio UX polish (`barber.tsx`: typed state, scroll insets, remove `any[]`)
- [ ] Mobile web tab layout parity (`(tabs)/_layout.web.tsx` — verify all hrefs with typed routes)
- [ ] Barber picker for chat (from shop/worker list)
- [ ] Dedicated mobile tab bar icons
- [ ] Shop timezone field + slot engine uses it
- [ ] Loading/error states on admin dashboard fetches
- [ ] Split admin `App.tsx` into `pages/Overview.tsx`, `Shops.tsx`, `Feedbacks.tsx`

### P2 — Product enhancements

- [ ] Portfolio image upload (Supabase Storage)
- [ ] Push notifications (booking approved, payment received)
- [ ] Password reset / magic link
- [ ] Admin booking list with filters
- [ ] Pay-after-approve flow (optional)
- [ ] Refund path for rejected bookings after payment
- [ ] RLS policies (if ever exposing Supabase to clients — **not recommended**)
- [ ] Encrypt calendar refresh tokens
- [ ] Cancel/delete calendar events on booking reject/cancel

### P3 — Nice to have

- [ ] In-app camera guided 3-angle capture for style guide
- [ ] i18n (Urdu / English)
- [ ] Analytics events
- [ ] Rate limiting on public auth routes

---

## Changelog (agent-maintained)

Agents **must** append a row when merging meaningful work.

| Date | Author | Area | Change |
|------|--------|------|--------|
| 2026-06-15 | Agent | Infra | Umbrella monorepo at workspace root; `scripts/repo-mode.sh` toggles mono (umbrella) vs inner (per-app repos); see `repos-mngmnt.txt` + `.cursor/rules/repo-mode.mdc` |
| 2026-06-04 | Agent | Payments | SafePay checkout: metadata `order_id` only (fixes `unsupported meta key user_id`); Zod checkout body; `toSafepayApiError` |
| 2026-06-04 | Agent | Mobile | Studio navigation: root `Stack` + `(tabs)/` NativeTabs; `barber`/`checkout`/`book` as stack pushes; B-020 resolved |
| 2026-06-04 | Agent | Booking/maps | `assertSlotBookable` + shop timezone migration; Zod booking routes; mobile book/bookings UX (cancel, pay, track); admin `GET /admin/bookings` + Bookings tab |
| 2026-06-04 | Agent | mobile/docs | Nearby shops: GPS try/catch + city-center fallback; `appAlert`/`AppDialog` replaces `Alert.alert`; design-system rules updated |
| 2026-06-04 | Agent | mobile/backend | Barber home: side-by-side Add shop / Studio cards, pull-to-refresh my shops; Profile tab (`profile.tsx`, `lib/profile.ts`); Zod on `PUT /app/profile` |
| 2026-06-04 | Agent | Mobile | API connectivity: `api-config.ts`, app-open `GET /v1/health` via `ApiConnectivityProvider`, ngrok header, dev status banner, `app.config.js` env validation, `npm run start:clear`; removed hardcoded ngrok fallback |
| 2026-06-04 | Agent | Docs | TypeScript quality: `docs/code-quality.md` TS sections, `.agents/skills/typescript-quality/SKILL.md`, `typescript-quality.mdc`; Fallow `unused-types: warn` |
| 2026-06-04 | Agent | Docs | Fallow `.fallowrc.json` tuned (monorepo entry points, `ignoreExportsUsedInFile`, Expo plugins); `docs/code-quality.md` metrics refreshed |
| 2026-06-04 | Agent | Docs | Fallow baseline in `docs/code-quality.md`; mandatory `code-quality.mdc` + AGENTS.md Fallow section |
| 2026-05-21 | Agent | All | Initial remaining-features plan: booking, calendar, SafePay mobile, Gemini, chat, admin tables |
| 2026-05-21 | Agent | Mobile | Barber approve modal; Support tab feedback form |
| 2026-05-21 | Agent | Docs | Created `docs/PROJECT_PROGRESS.md` + Cursor rule |
| 2026-05-21 | Agent | DB | Applied all migrations to Supabase; fixed `ai_analyses` columns + auth trigger syntax |
| 2026-05-21 | Agent | Backend | Fix `.env` load order: `src/loadEnv.ts`, lazy Supabase config (startup `configured:true` when keys set) |
| 2026-05-21 | Agent | Mobile | Auth: validate session via `getMe()` on launch; clear stale tokens; skip protected fetches without token; remount tabs after login |
| 2026-05-21 | Agent | Mobile | Dev: fix `EXPO_PUBLIC_API_URL` typo; document LAN IP / 401 vs Network Error (not CORS on native) |
| 2026-05-21 | Agent | Docs | Known issues B-011–B-014; mobile dev networking section |
| 2026-05-21 | Agent | Auth | Replaced Supabase Auth with local JWT + bcrypt refresh_sessions; Google idToken + Microsoft login OAuth; migration `20250523000000_local_auth.sql` |
| 2026-05-21 | Agent | Mobile | expo-auth-session Google/Microsoft; persistent refresh tokens; phone auth UI removed |
| 2026-05-21 | Agent | Docs | Updated AGENTS.md, api-architecture.mdc, project-structure.mdc; `seed:admin` script |
| 2026-05-21 | Agent | Docs | Synced AGENTS.md + docs/README.md with local JWT auth, env checklist, known issues B-014–B-016 |
| 2026-05-21 | Agent | Mobile | AuthSession context; guest-only overlay (no tab mount); JWT exp refresh on cold start; role-aware Bookings tab; admin home message |
| 2026-05-23 | Agent | Mobile | UI foundation: NativeWind v4, Moti, expo-haptics/blur; `HapticPressable`, `GlassSurface`, `MotiFadeIn`; `.cursor/rules/mobile-ui-stack.mdc` |
| 2026-05-23 | Agent | UI | Elegant Terracotta design system: `docs/design-system/`, wired mobile + admin; `design-system.mdc` + validate skill/script |
| 2026-05-23 | Agent | Mobile | Design migration: all `src/app` screens + shared components → NativeWind/semantic tokens; terracotta splash icon; `validate:design` passes 39 files |
| 2026-05-23 | Agent | Mobile | Brand splash (`#E77423`), iOS/Android light+dark icons, display name `BookMyBarber`; assets in `assets/images/brand/` |
| 2026-05-23 | Agent | Mobile | Windows Android MAX_PATH: Ninja 1.12.1 + `withNinjaLongPaths` plugin + `setup-windows-ninja.ps1`; B-017 |
| 2026-06-02 | Agent | Mobile | Windows Android MAX_PATH fix: corrected `withNinjaLongPaths` / `android/app/build.gradle` to `-DCMAKE_OBJECT_PATH_MAX=240` so CMake shortens long object paths |
| 2026-06-02 | Agent | Mobile | Fixed Expo Metro bundling failure by adding missing `babel-preset-expo` to `BookMyBarber-App` devDependencies |
| 2026-06-04 | Agent | backend/mobile/admin/docs | DB-first shop locations: require coords + formatted address on shop create/update; replace Google Places/Directions with Geoapify autocomplete, ORS geocode, GraphHopper routing; admin shows address/coords only |
| 2026-06-02 | Agent | backend/mobile/admin | Added map-based nearby shop discovery, barber location update endpoint, Google Places autocomplete/details integration, location/business enrichment schema migration, mobile map/location picker UI, and admin location/business metadata visibility |
| 2026-06-02 | Agent | backend/mobile | Added customer live tracking with `react-native-geolocation-service`, backend driving route endpoint (`/app/maps/route`), route polyline rendering, and external navigation handoff to map apps |
| 2026-06-02 | Agent | backend/mobile | Fixed Add Shop UX when Places is unavailable: clearer backend diagnostics, debounced autocomplete, one-time config alert, always-visible native map picker, and manual current-location/pin fallback |
| 2026-06-04 | Agent | admin/backend | Admin ngrok header + relaxed dev CORS (localhost/ngrok origins); shops tab shows API errors; `GET /admin/shops` owner embed fallback |
| 2026-06-04 | Agent | mobile/backend/db | Add-shop business phone (+92 PK format); `business_phone` migration applied; POST `/app/shops` requires `businessPhone` |
| 2026-06-04 | Agent | mobile | Lazy-load MapLibre impl (no crash in Expo Go); `MapUnavailable` fallback; real maps still need `npx expo run:android` + MapTiler key |
| 2026-06-04 | Agent | mobile | Replaced `react-native-maps` (Google SDK) with `@maplibre/maplibre-react-native` + MapTiler; center-crosshair shop picker; `formatApiError` shows backend `error` on shop POST failures |
| 2026-06-04 | Agent | backend | Shop POST `DB_INSERT_FAILED` logs ownerId + message; API errors include `message` alias for clients |

### Changelog template (copy for new entries)

```markdown
| YYYY-MM-DD | Name/Agent | backend \| mobile \| admin \| db | Short description; link PR/issue if any |
```

---

## Testing checklist

### Backend (`BookMyBarber-bk`)

```bash
cd BookMyBarber-bk && npm run build && npm run dev
# GET http://localhost:5000/v1/health
```

### Admin

```bash
cd BookMyBarber-admin && npm run dev
# Login as admin → Overview / Shops / Feedbacks
```

### Mobile

```bash
cd BookMyBarber-bk && npm run dev          # must be running first
cd BookMyBarber-App && npx expo start -c  # -c after .env changes
```

**Physical device checklist:**

1. `BookMyBarber-App/.env` → `EXPO_PUBLIC_API_URL=http://<PC_LAN_IP>:5000/v1` **or** `https://<ngrok-subdomain>.ngrok-free.app/v1`
2. Phone and PC on same Wi‑Fi (LAN) or ngrok tunnel running; allow Node/port 5000 in Windows firewall (LAN)
3. `npm run start:clear` after any `.env` change; reload Expo Go
4. On app open — expect `GET /v1/health` in backend logs (before sign-in); dev banner shows Connected
5. Sign in via auth overlay — expect `POST /v1/auth/login 200` then `GET /v1/auth/me 200`
6. 401 on startup **before** login is normal for protected routes; should stop after sign-in

**Flows:**

- Customer: search shop → Book → Pay
- Barber: Studio → services, hours, inbox, calendar

---

## Related documentation

| Document | Purpose |
|----------|---------|
| [`AGENTS.md`](../AGENTS.md) | Short agent entry point |
| [`.cursor/rules/project-structure.mdc`](../.cursor/rules/project-structure.mdc) | Folder layout (always applied) |
| [`.cursor/rules/api-architecture.mdc`](../.cursor/rules/api-architecture.mdc) | Gateway pattern (always applied) |
| [`.cursor/rules/project-progress.mdc`](../.cursor/rules/project-progress.mdc) | Rule: read & update this file |
| [`.cursor/skills/safepay/SKILL.md`](../.cursor/skills/safepay/SKILL.md) | SafePay integration |
| [`docs/PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) | **This file** — full progress tracker |

---

## Original product task list (high level)

| Epic | Status |
|------|--------|
| Database schema & migrations | ✅ |
| Auth (email, phone, OTP, Google) | ✅ |
| Mobile & admin auth screens | ✅ |
| Barber shop showcase & portfolios | 🟡 (no portfolio images) |
| Booking system & calendar | ✅ core / 🟡 OAuth ops |
| SafePay payments | ✅ code / 🔧 ops |
| Gemini AI style guide & chat | ✅ code / 🔧 API key |
| Admin dashboard UI | ✅ core tables & charts |

---

*End of PROJECT_PROGRESS.md — keep this file accurate so the next agent does not rediscover the same gaps.*
