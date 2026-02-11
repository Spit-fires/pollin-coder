/**
 * Admin authentication and authorization utilities
 * Separate from main user auth system using email/password
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getPrisma } from './prisma';

const SALT_ROUNDS = 12;
const TOKEN_TTL_HOURS = 24; // 24 hours for persistent sessions

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token for admin sessions
 */
export function generateAdminToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Store an admin session token in the database
 */
export async function storeAdminSession(token: string, adminId: string, email: string): Promise<void> {
  const prisma = getPrisma();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  
  await prisma.adminSession.create({
    data: {
      token,
      adminId,
      email,
      expiresAt,
    },
  });
  
  // Cleanup expired sessions periodically
  await cleanupExpiredSessions();
}

/**
 * Verify an admin token and return admin info from the database
 */
export async function verifyAdminToken(token: string): Promise<{ adminId: string; email: string } | null> {
  const prisma = getPrisma();
  
  const session = await prisma.adminSession.findUnique({
    where: { token },
  });
  
  if (!session) {
    return null;
  }
  
  // Check if expired
  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.adminSession.delete({
      where: { id: session.id },
    }).catch(() => {}); // Ignore errors if already deleted
    return null;
  }
  
  return { adminId: session.adminId, email: session.email };
}

/**
 * Remove an admin session token from the database (logout)
 */
export async function removeAdminSession(token: string): Promise<void> {
  const prisma = getPrisma();
  
  await prisma.adminSession.deleteMany({
    where: { token },
  }).catch(() => {}); // Ignore errors if not found
}

/**
 * Cleanup expired sessions from the database
 */
async function cleanupExpiredSessions(): Promise<void> {
  const prisma = getPrisma();
  
  await prisma.adminSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  }).catch(() => {}); // Ignore errors
}

/**
 * Extract admin token from X-Admin-Token header
 */
export function extractAdminToken(request: Request): string | null {
  const token = request.headers.get('X-Admin-Token');
  return token || null;
}

/**
 * Require admin authentication - throws if not authenticated or session expired
 */
export async function requireAdmin(request: Request) {
  const token = extractAdminToken(request);
  
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  const session = await verifyAdminToken(token);
  
  if (!session) {
    throw new Error('Invalid or expired admin session');
  }
  
  // Fetch full admin details from database
  const prisma = getPrisma();
  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });
  
  if (!admin) {
    throw new Error('Admin account not found');
  }
  
  return admin;
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const prisma = getPrisma();
  
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
