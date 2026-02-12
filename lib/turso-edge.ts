/**
 * Direct Turso/libSQL queries for edge runtime (no Prisma).
 * Uses HTTP transport via @libsql/client/web for edge compatibility.
 */

import { createClient } from "@libsql/client/web";

const globalForTurso = globalThis as unknown as {
  tursoClient: ReturnType<typeof createClient> | undefined;
};

export const getTursoClient = () => {
  if (!globalForTurso.tursoClient) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL environment variable is required");
    }

    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error("TURSO_AUTH_TOKEN environment variable is required");
    }

    globalForTurso.tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalForTurso.tursoClient;
};

export interface MessageWithChat {
  id: string;
  chatId: string;
  role: string;
  content: string;
  position: number;
  chat: {
    id: string;
    userId: string | null;
  };
}

export interface Message {
  id: string;
  role: string;
  content: string;
  position: number;
}

/**
 * Get a message by ID with its chat
 */
export async function getMessageWithChat(
  messageId: string
): Promise<MessageWithChat | null> {
  const client = getTursoClient();
  
  const result = await client.execute({
    sql: `SELECT 
            m.id, m.chatId, m.role, m.content, m.position,
            c.id as chat_id, c.userId as chat_userId
          FROM Message m
          INNER JOIN Chat c ON m.chatId = c.id
          WHERE m.id = ?`,
    args: [messageId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    chatId: row.chatId as string,
    role: row.role as string,
    content: row.content as string,
    position: row.position as number,
    chat: {
      id: row.chat_id as string,
      userId: row.chat_userId as string | null,
    },
  };
}

/**
 * Get messages for a chat up to a specific position
 */
export async function getMessagesForChat(
  chatId: string,
  maxPosition: number
): Promise<Message[]> {
  const client = getTursoClient();
  
  const result = await client.execute({
    sql: `SELECT id, role, content, position
          FROM Message
          WHERE chatId = ? AND position <= ?
          ORDER BY position ASC`,
    args: [chatId, maxPosition],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    role: row.role as string,
    content: row.content as string,
    position: row.position as number,
  }));
}

/**
 * Get user by email (for auth)
 */
export async function getUserByEmail(email: string) {
  const client = getTursoClient();
  
  const result = await client.execute({
    sql: `SELECT id, email, name, tier, createdAt, updatedAt, role
          FROM User
          WHERE email = ?`,
    args: [email],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string | null,
    tier: row.tier as string | null,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    role: row.role as string,
  };
}
