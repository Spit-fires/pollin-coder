export const domain =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? "https://polli-coder.megavault.in"
    : process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_DEVELOPMENT_URL
          // Enforce https in non-development environments to prevent mixed content
          ? (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEVELOPMENT_URL.startsWith('https://')
              ? `https://${process.env.NEXT_PUBLIC_DEVELOPMENT_URL.replace(/^https?:\/\//, '')}`
              : process.env.NEXT_PUBLIC_DEVELOPMENT_URL)
          : "http://localhost:3000";
