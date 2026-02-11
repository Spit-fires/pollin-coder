# Pollin Coder — Copilot Instructions

## Project Overview

Pollin Coder is an AI code generator that creates single-page React apps from user prompts. It uses a **BYOP (Bring Your Own Pollen)** auth model — users authenticate with their own Pollinations.ai accounts and pay for their own AI usage. There are zero server-side API keys for LLM inference.

## Architecture

- **Framework**: Next.js 15 (App Router) with React 19, TypeScript, Tailwind CSS 3, pnpm
- **Database**: Turso (libSQL/SQLite) via Prisma with `@prisma/adapter-libsql` driver adapter
- **AI Backend**: Pollinations.ai API (`gen.pollinations.ai`) — OpenAI-compatible chat completions endpoint
- **Code Sandbox**: Sandpack (CodeSandbox) for live code preview in-browser
- **Deployment**: Vercel (see `vercel.json` for function configs and security headers)
- **Admin Panel**: Separate admin system at `/admin` with DB-backed sessions and password auth

### Route Groups

- `app/(auth)/` — Login and OAuth callback pages (public, no auth required)
- `app/(main)/` — Authenticated app shell: home page, chat views, projects, developers
- `app/api/` — API routes for auth, streaming completions, projects, uploads, model listing
- `app/share/` — Public share pages for generated apps (no auth required)
- `app/admin/` — Admin panel: dashboard, user management, chat management, feature flags

### Key Data Flow

1. User authenticates via Pollinations OAuth → callback extracts `api_key` from URL fragment → stores in `localStorage` via `setApiKey()` (base64-encoded with checksum)
2. Client components read the API key from `localStorage` via `getApiKey()` and pass it to server actions/API routes
3. `getCurrentUser(apiKey)` in `lib/auth.ts` validates the key against upstream Pollinations API (with 30s in-memory cache)
4. User submits a prompt → `createChat(apiKey, ...)` server action (`app/(main)/actions.ts`) orchestrates a multi-step LLM pipeline: example matching → architecture planning → code generation
5. Streaming completions flow through `POST /api/get-next-completion-stream-promise` → rendered in chat view with live Sandpack preview

### Data Models (Prisma)

Models in `prisma/schema.prisma`:
- **User** — Pollinations-authenticated users with `Role` enum (USER/ADMIN)
- **Chat** — User chats with prompt, title, model, messages
- **Message** — Ordered chat messages (role + content + position)
- **GeneratedApp** — Standalone generated apps (legacy)
- **Admin** — Admin panel users with password hash auth
- **AdminSession** — DB-backed admin sessions (token + expiry)
- **AuditLog** — Admin action audit trail
- **FeatureFlag** — Runtime-toggleable feature flags (key + enabled + description)

The schema uses SQLite via Turso.

## Development

```bash
pnpm install          # Required (enforced via preinstall hook)
pnpm dev              # Start Next.js dev server
pnpm lint             # ESLint + TypeScript type-check (tsc --noEmit)
pnpm db:migrate       # Run Prisma migrations
pnpm db:studio        # Open Prisma Studio
```

Environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) are required. Prisma client is auto-generated on `postinstall`.

## Conventions & Patterns

### Authentication

- **localStorage-only model**: API keys are stored client-side in `localStorage` via `lib/secure-storage.ts` (base64-encoded with checksum validation). **There are NO cookies** — the cookie-to-localStorage migration is complete.
- Use `getApiKey()` from `lib/secure-storage.ts` to read the key in client components
- Server actions **require an `apiKey: string` parameter** — client components must read from `localStorage` and pass it explicitly
- **Server components CANNOT access the API key** (no cookies, no localStorage). Auth-gated data must be fetched client-side via `authFetch()` or passed through server actions.
- Use `getCurrentUser(apiKey)` from `lib/auth.ts` for optional auth checks (returns `null` if unauthenticated)
- Use `requireAuth(apiKey)` for server actions that must be authenticated (throws "Authentication required" error)
- API routes extract the key from `X-Pollinations-Key` header via `extractApiKeyFromHeader(request)` — client-side `authFetch()` attaches this header automatically
- Keys are validated against upstream Pollinations API on each request (with 30s in-memory cache)
- Middleware (`middleware.ts`) allowlists public routes; client-side `providers.tsx` redirects unauthenticated users to `/login`

**Pattern for server actions:**
```ts
export async function myAction(apiKey: string, ...otherParams) {
  const user = await requireAuth(apiKey);
  // ... rest of logic
}

// Client component usage:
import { getApiKey } from "@/lib/secure-storage";
const apiKey = getApiKey();
if (!apiKey) { /* redirect to login */ }
await myAction(apiKey, ...);
```

**Pattern for API routes (client → server):**
```ts
// Client: authFetch() from lib/api-client.ts auto-attaches X-Pollinations-Key header
const res = await authFetch("/api/my-endpoint");

// Server: extract and validate
const apiKey = extractApiKeyFromHeader(request);
const user = await getCurrentUser(apiKey || undefined);
```

### Admin Panel

- Separate auth system using `X-Admin-Token` header with DB-backed sessions (`AdminSession` table)
- Admin client utilities in `lib/admin-client.ts` — `adminFetch()` attaches the token
- Admin auth helpers in `lib/admin-auth.ts` — `requireAdmin(request)`, `logAdminAction()`
- Admin routes at `/admin/*` with layout protection
- Audit logging for admin actions (user deletion, feature flag changes, etc.)

### Server Actions & API Routes

- All server actions use `"use server"` directive and live in `app/(main)/actions.ts`
- Input validation uses **Zod schemas** — always validate before processing
- API routes apply **in-memory rate limiting** (`lib/rate-limit.ts`) per IP — configure limits as `{ maxRequests, windowMs }`
- Use `getPrisma()` singleton from `lib/prisma.ts` — never instantiate `PrismaClient` directly

### Styling

- Tailwind CSS with custom `Aeonik` font family, shadcn/ui color system (CSS variables)
- UI primitives in `components/ui/` (Button, Card, Drawer, Switch, Toast) built on Radix UI
- Use `cn()` helper from `lib/utils.ts` for conditional class merging (`clsx` + `tailwind-merge`)
- Three.js background scenes via `@react-three/fiber` and `@react-three/drei`

### LLM Prompt System

- Prompts are defined in `lib/prompts.ts` using `dedent` for clean template literals
- Three-phase generation: `softwareArchitectPrompt` → `screenshotToCodePrompt` (optional) → `getMainCodingPrompt()`
- Generated code targets single-component React + Tailwind + TypeScript + Lucide icons + shadcn UI
- Shadcn component source strings are embedded in `lib/shadcn.ts` (~3000 lines) for injection into prompts
- AI-generated apps can use Pollinations API endpoints for image/text/audio generation

### Feature Flags

- **DB-backed with env var fallback**: `lib/features.ts` checks the `FeatureFlag` table first, falls back to `process.env`
- Canonical keys defined in `FEATURE_KEYS`: `uploadEnabled`, `screenshotFlowEnabled`, `shadcnEnabled`
- Read: `getFeatureFlag(key)` / `getAllFeatureFlags()` — async, checks DB then env
- Write: `setFeatureFlag(key, enabled)` — upserts in the `FeatureFlag` table
- Admin toggles at `/admin/features` call `POST /api/admin/features`
- Client fetches flags from `GET /api/features` on mount

### Models

- Available models fetched from `GET /api/v1/models` (proxies Pollinations API)
- Fallback models defined in `lib/constants.ts` (`FALLBACK_MODELS`)
- Task-specific models configured in `TASK_MODELS` (e.g., `openai-fast` for titles, `qwen-coder` for architecture)
- User preference stored in localStorage via `hooks/use-models.ts`

### Code Parsing

- `lib/utils.ts` contains `extractFirstCodeBlock()` and `splitByFirstCodeFence()` for parsing LLM markdown output into executable code blocks with language/filename metadata

## Security Notes

- SSRF protection: screenshot URLs are allowlisted to specific domains (`catbox.moe`, `amazonaws.com`)
- API key format validated with regex in middleware and callback
- CSP headers configured in `vercel.json` — update when adding new external domains
- All upstream API calls use `AbortController` with 10s timeouts
- Chat pages accessible by cuid ID (unguessable) without server-side auth — mutations require apiKey
- Admin panel uses separate password-based auth with DB-backed sessions (not shared with user auth)
