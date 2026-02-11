/**
 * Initialize local SQLite database with schema
 * Run this script to create tables when using local development database
 */

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const dbDir = path.dirname(dbPath);
  
  // Ensure prisma directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create libSQL client
  const client = createClient({
    url: `file:${dbPath}`,
  });

  console.log('Initializing database schema...');

  try {
    // Create User table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        tier TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS User_email_idx ON User(email)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS User_role_idx ON User(role)`);

    // Create Admin table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Admin (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        name TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS Admin_email_idx ON Admin(email)`);

    // Create AdminSession table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS AdminSession (
        id TEXT PRIMARY KEY NOT NULL,
        token TEXT NOT NULL UNIQUE,
        adminId TEXT NOT NULL,
        email TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (adminId) REFERENCES Admin(id) ON DELETE CASCADE
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS AdminSession_token_idx ON AdminSession(token)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS AdminSession_adminId_idx ON AdminSession(adminId)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS AdminSession_expiresAt_idx ON AdminSession(expiresAt)`);

    // Create AuditLog table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS AuditLog (
        id TEXT PRIMARY KEY NOT NULL,
        adminId TEXT NOT NULL,
        action TEXT NOT NULL,
        targetId TEXT,
        metadata TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS AuditLog_adminId_idx ON AuditLog(adminId)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS AuditLog_createdAt_idx ON AuditLog(createdAt)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS AuditLog_action_idx ON AuditLog(action)`);

    // Create GeneratedApp table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS GeneratedApp (
        id TEXT PRIMARY KEY NOT NULL,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        code TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS GeneratedApp_model_idx ON GeneratedApp(model)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS GeneratedApp_createdAt_idx ON GeneratedApp(createdAt)`);

    // Create Chat table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Chat (
        id TEXT PRIMARY KEY NOT NULL,
        model TEXT NOT NULL,
        quality TEXT NOT NULL,
        prompt TEXT NOT NULL,
        title TEXT NOT NULL,
        pollinCoderVersion TEXT NOT NULL DEFAULT 'v2',
        shadcn INTEGER NOT NULL,
        userId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS Chat_userId_idx ON Chat(userId)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS Chat_createdAt_idx ON Chat(createdAt)`);

    // Create Message table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Message (
        id TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        chatId TEXT NOT NULL,
        position INTEGER NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES Chat(id) ON DELETE CASCADE
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS Message_chatId_idx ON Message(chatId)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS Message_chatId_position_idx ON Message(chatId, position)`);

    // Create FeatureFlag table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS FeatureFlag (
        id TEXT PRIMARY KEY NOT NULL,
        key TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS FeatureFlag_key_idx ON FeatureFlag(key)`);

    // Create _prisma_migrations table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id TEXT PRIMARY KEY NOT NULL,
        checksum TEXT NOT NULL,
        finished_at DATETIME,
        migration_name TEXT NOT NULL,
        logs TEXT,
        rolled_back_at DATETIME,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    console.log('✅ Database schema initialized successfully!');
    console.log('All tables created:');
    console.log('  - User');
    console.log('  - Admin');
    console.log('  - AdminSession');
    console.log('  - AuditLog');
    console.log('  - GeneratedApp');
    console.log('  - Chat');
    console.log('  - Message');
    console.log('  - FeatureFlag');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

// Check if @libsql/client is installed
try {
  require.resolve('@libsql/client');
  initDatabase();
} catch (e) {
  console.error('Error: @libsql/client is not installed.');
  console.error('Please run: pnpm add @libsql/client');
  process.exit(1);
}
