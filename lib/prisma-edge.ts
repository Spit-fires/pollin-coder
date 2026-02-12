import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Edge-compatible Prisma singleton using HTTP transport.
// Note: We import from @prisma/client (NOT /edge) because we're using a driver adapter.
// The adapter automatically selects HTTP transport in edge runtime for compatibility.
// Used by routes with `export const runtime = "edge"`.
// Node.js routes should continue using lib/prisma.ts for native TCP performance.

const globalForPrismaEdge = globalThis as unknown as {
  prismaEdge: PrismaClient | undefined;
};

export const getPrismaEdge = () => {
  if (!globalForPrismaEdge.prismaEdge) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL environment variable is required");
    }

    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error("TURSO_AUTH_TOKEN environment variable is required");
    }

    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    globalForPrismaEdge.prismaEdge = new PrismaClient({
      adapter,
    } as any);
  }
  return globalForPrismaEdge.prismaEdge;
};
