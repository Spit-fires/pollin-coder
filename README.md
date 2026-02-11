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

### Admin Panel (Optional)

If you want to enable the admin panel for user and content moderation:

- `ALLOW_ADMIN_REGISTRATION`: Set to `true` to allow admin account creation (disable after first admin is created)
- `ADMIN_REGISTRATION_KEY`: Secret key required for admin registration (recommended for production)

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
4. **The key is stored client-side in localStorage** (base64 encoded with checksum validation)
5. All API calls send the key in the `X-Pollinations-Key` header
6. **Security:** Enhanced CSP headers prevent XSS attacks; keys never touch server storage

**For users to get started:**
- Sign up at [enter.pollinations.ai](https://enter.pollinations.ai)
- Get some free Pollen to start (included with signup)
- Connect your account to this app

No server-side API key needed! Each user brings their own.

## Admin Panel

The admin panel provides full control over users, content, and system statistics.

### Setup

1. **Enable registration** (temporarily):
   ```bash
   ALLOW_ADMIN_REGISTRATION=true
   ADMIN_REGISTRATION_KEY=your_secret_key_here
   ```

2. **Create first admin account**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "secure_password",
       "registrationKey": "your_secret_key_here"
     }'
   ```

3. **Disable registration** (recommended for production):
   ```bash
   ALLOW_ADMIN_REGISTRATION=false
   ```

4. **Access admin panel** at `/admin/login`

### Features

- **Dashboard**: System statistics, recent activity, model usage breakdown
- **User Management**: View all users, delete accounts (cascade deletes chats/messages)
- **Chat Moderation**: View and delete inappropriate content
- **Feature Flags**: View current feature flag states
- **Audit Log**: All admin actions are logged with metadata

### Security

- Separate authentication system from user auth (email/password with bcrypt)
- Session tokens stored in-memory (15-minute TTL)
- Rate limiting on login attempts (5 attempts per 15 minutes)
- All admin actions logged to audit trail

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
