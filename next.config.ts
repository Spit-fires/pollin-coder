import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable X-Powered-By header to prevent framework fingerprinting
  poweredByHeader: false,
  // Enable React strict mode for catching bugs in development
  reactStrictMode: true,
  // Set the workspace root to silence multiple lockfile warnings
  outputFileTracingRoot: __dirname,
  // All external packages listed here
  serverExternalPackages: ["@codesandbox/sandpack-react", "@prisma/client", "prisma", "@libsql/client", "libsql", "@prisma/adapter-libsql"],
  // Configure allowed external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.catbox.moe',
      },
      {
        protocol: 'https',
        hostname: 'litter.catbox.moe',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'gen.pollinations.ai',
      },
    ],
  },
  // Optimize barrel export packages for smaller bundles
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
  },
  webpack: (config, options) => {
    if (options.nextRuntime === "edge") {
      if (!config.resolve.conditionNames) {
        config.resolve.conditionNames = ["require", "node"];
      }
      if (!config.resolve.conditionNames.includes("worker")) {
        config.resolve.conditionNames.push("worker");
      }
    }

    // Ignore README files in node_modules to prevent webpack parse errors
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /\.md$/,
        contextRegExp: /node_modules/,
      })
    );
    
    return config;
  },
};

export default nextConfig;
