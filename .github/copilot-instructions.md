# Pollin Coder — Copilot Instructions

## Project Overview

Pollin Coder is an AI code generator that creates single-page React apps from user prompts. It uses a **BYOP (Bring Your Own Pollen)** auth model — users authenticate with their own Pollinations.ai accounts and pay for their own AI usage. There are zero server-side API keys for LLM inference.

## Architecture

- **Framework**: Next.js 15 (App Router) with React 19, TypeScript, Tailwind CSS 3, pnpm
- **Database**: Turso (libSQL/SQLite) via Prisma with `@prisma/adapter-libsql` driver adapter
- **AI Backend**: Pollinations.ai API (`gen.pollinations.ai`) — OpenAI-compatible chat completions endpoint
- **Code Sandbox**: Sandpack (CodeSandbox) for live code preview in-browser
- **Deployment**: Vercel (see `vercel.json` for function configs and security headers)

### Route Groups

- `app/(auth)/` — Login and OAuth callback pages (public, no auth required)
- `app/(main)/` — Authenticated app shell: home page, chat views, projects, developers
- `app/api/` — API routes for auth, streaming completions, projects, uploads, model listing
- `app/share/` — Public share pages for generated apps (no auth required)

### Key Data Flow

1. User authenticates via Pollinations OAuth → callback extracts `api_key` from URL fragment → `POST /api/auth/set-key` sets httpOnly cookie
2. `getCurrentUser()` in `lib/auth.ts` validates the cookie against upstream Pollinations API (with 30s in-memory cache)
3. User submits a prompt → `createChat` server action (`app/(main)/actions.ts`) orchestrates a multi-step LLM pipeline: example matching → architecture planning → code generation
4. Streaming completions flow through `POST /api/get-next-completion-stream-promise` → rendered in chat view with live Sandpack preview

### Data Models (Prisma)

Four models in `prisma/schema.prisma`: `User`, `Chat`, `Message`, `GeneratedApp`. Chats belong to users; messages are ordered by `position`. The schema uses SQLite via Turso.

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

- Use `getCurrentUser()` from `lib/auth.ts` for optional auth checks (returns `null` if unauthenticated)
- Use `requireAuth()` for server actions/routes that must be authenticated (throws redirect to `/login`)
- API key is stored in `pollinations_api_key` httpOnly cookie, validated against upstream on each request (cached 30s)
- Middleware (`middleware.ts`) handles route protection — public routes are allowlisted

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

- Controlled via environment variables, checked through `lib/features.ts`
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
