# Pollin Coder

![Pollin Coder Logo](./public/og-image.png)

<h1 align="center">Pollin Coder</h1>

<p align="center">
  An open-source AI code generator that lets you create small apps with a single prompt. Powered by advanced AI models and the Pollinations.ai platform.
</p>

## Features

- Generate full-stack apps or code snippets from a single prompt
- Uses state-of-the-art models for code and text generation
- Live code sandbox powered by Sandpack
- Built with Next.js, Tailwind CSS, and modern web tech
- Analytics and observability ready (Plausible, Helicone)

## Tech Stack

- [Pollinations AI](https://pollinations.ai/) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the code sandbox
- Next.js app router with Tailwind
- Helicone for observability (optional)
- Plausible for website analytics

## Getting Started

1. Clone the repo: `git clone https://github.com/iotserver24/pollin-coder`
2. Copy `.env.example` to `.env.local` and configure your environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Install dependencies: `pnpm install` (or `npm install`)
4. Start the dev server: `pnpm dev` (or `npm run dev`)
5. Visit `http://localhost:3000` and click "Connect with Pollinations" to authenticate

## Environment Variables

The application uses the following environment variables:

- `TURSO_DATABASE_URL`: Turso database URL (required) - Get one from [Turso](https://turso.tech/)
- `TURSO_AUTH_TOKEN`: Turso auth token (required for production)

### Pollinations AI Authentication (BYOP - Bring Your Own Pollen)

**This app uses the BYOP model:** Users authenticate with their own Pollinations accounts, and each user pays for their own AI usage. This means:

- ✅ **Zero API costs for you** - No matter how many users you have
- ✅ **No API key management** - Users bring their own keys
- ✅ **Built-in rate limiting** - Each user has their own quota
- ✅ **Transparent billing** - Users see exactly what they're paying for

**How it works:**

1. User clicks "Connect with Pollinations" in your app
2. They're redirected to `enter.pollinations.ai` to authorize
3. They're redirected back with an API key in the URL fragment
4. The key is stored securely in an httpOnly cookie
5. All API calls use the user's key

**For users to get started:**
- Sign up at [enter.pollinations.ai](https://enter.pollinations.ai)
- Get some free Pollen to start (included with signup)
- Connect your account to this app

No server-side API key needed! Each user brings their own.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Credits

### Original Creator
- **R3AP3R / iotserver24** - Created the original Pollin Coder project
- GitHub: [iotserver24/pollin-coder](https://github.com/iotserver24/pollin-coder)

### Current Maintainer
- **spit-fires** - Current maintainer and developer
- Responsible for BYOP authentication migration, feature flags, and ongoing improvements

### Powered By
- **[Pollinations AI](https://pollinations.ai)** - Advanced AI models for code generation

---

© 2025 Pollin Coder Project. Licensed under MIT.
