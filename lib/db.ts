import { getPrisma } from './prisma';

// Use the singleton pattern - don't instantiate at module load time
export { getPrisma };

// Reference to the global singleton for cleanup
const globalForPrisma = globalThis as unknown as { prisma: any | undefined };

// Gracefully shutdown the database connection
export async function disconnectDb() {
  const prisma = getPrisma();
  await prisma.$disconnect();
  // Clear the singleton so it can be recreated if needed
  globalForPrisma.prisma = undefined;
} 