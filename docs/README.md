# BookMyBarber documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [**PROJECT_PROGRESS.md**](PROJECT_PROGRESS.md) | Developers & AI agents | **Main tracker** — features, APIs, bugs, backlog, changelog, env checklist |
| [**code-quality.md**](code-quality.md) | Developers & AI agents | **Fallow + TypeScript** — dead code, dupes, complexity, tsc, DTO alignment (mandatory for agents) |
| [**AGENTS.md**](../AGENTS.md) | AI agents | Architecture rules, API surface, env vars, quick start |

For Cursor rules, see [`.cursor/rules/`](../.cursor/rules/) (`api-architecture.mdc`, `project-structure.mdc`, `project-progress.mdc`, `code-quality.mdc`, `typescript-quality.mdc`, `documentation-updates.mdc`).

**Agents:** Update `code-quality.md` and `PROJECT_PROGRESS.md` on **every** code change (mandatory — `documentation-updates.mdc`).

## Auth model (current)

- **No Supabase Auth** — users live in `public.profiles` with bcrypt passwords and optional OAuth ids.
- **Sessions** — short-lived access JWT + refresh token in `public.refresh_sessions` (rotated on `POST /v1/auth/refresh`).
- **Clients** store `bmb_access_token` and `bmb_refresh_token`; never use `@supabase/supabase-js`.

## Quick dev troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Mobile **Network Error** | Bad API URL or backend down | `EXPO_PUBLIC_API_URL=http://<LAN_IP>:5000/v1` or ngrok HTTPS URL ending in `/v1`; start `BookMyBarber-bk`; `npm run start:clear` in `BookMyBarber-App` |
| **No backend hits** on sign-in (physical device) | Stale Metro bundle or wrong ngrok subdomain | Update `.env`; `npm run start:clear`; confirm `GET /v1/health` on app open in backend logs; dev banner should show Connected |
| **500 Auth not configured** | Missing `JWT_ACCESS_SECRET` | Set in `BookMyBarber-bk/.env`; restart backend |
| **401** after login | Expired access JWT | App should auto-refresh; sign in again if refresh missing |
| **Google Sign-In disabled** | No client ID | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + backend `GOOGLE_CLIENT_ID` |
| **Microsoft Sign-In fails** | Azure redirect mismatch | Add `bookmybarberapp://auth` and backend callback URI in Azure app |
| Backend **Supabase configured:false** | Missing secret key | Set real `SUPABASE_SECRET_KEY` (`sb_secret_…`); restart `npm run dev` |
| **CORS** on Expo Web / admin | Origin not allowed | Add to `CORS_ORIGINS` in backend `.env` |
| **Address search 503** on Add Shop | Missing `GEOAPIFY_API_KEY` | Set in backend `.env`; use map pin + manual address (still saves coords to DB) |
| **Cannot log in as admin** | No admin profile | `npm run seed:admin -- email 'password'` in `BookMyBarber-bk` |

Full detail: [PROJECT_PROGRESS.md → Environment variables](PROJECT_PROGRESS.md#environment-variables-checklist), [Known issues](PROJECT_PROGRESS.md#known-issues--bugs), [Mobile dev networking](PROJECT_PROGRESS.md#mobile-dev-networking-not-cors).
