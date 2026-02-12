const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIndex = line.indexOf('=');
    if (eqIndex > 0) {
      const key = line.substring(0, eqIndex).trim();
      const value = line.substring(eqIndex + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function applyMigrations() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env');
    console.error(`   TURSO_DATABASE_URL: ${url ? 'found' : 'missing'}`);
    console.error(`   TURSO_AUTH_TOKEN: ${authToken ? 'found' : 'missing'}`);
    console.error(`\n   Checked .env at: ${envPath}`);
    process.exit(1);
  }

  console.log(`📦 Connecting to ${url.replace(/\?.*/, '')}...\n`);
  
  const client = createClient({ url, authToken });
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => !f.includes('.toml'))
    .sort();

  for (const migration of migrations) {
    const sqlFile = path.join(migrationsDir, migration, 'migration.sql');
    if (!fs.existsSync(sqlFile)) continue;

    console.log(`📝 ${migration}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    try {
      await client.executeMultiple(sql);
      console.log(`✅ Applied\n`);
    } catch (err) {
      if (err.message?.includes('already exists')) {
        console.log(`⏭️  Already applied\n`);
      } else {
        console.error(`❌ Error: ${err.message}\n`);
        throw err;
      }
    }
  }

  await client.close();
  console.log('🎉 All migrations applied!');
}

applyMigrations().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
