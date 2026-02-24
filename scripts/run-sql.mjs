import pkg from '../backend/node_modules/pg/lib/index.js';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

// Load .env.production.local and parse manually
const envPath = path.resolve('project_raadso/backend/.env.production.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/) || line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].replace(/\\n$/, '');
  }
});

const connectionString = env.POSTGRES_URL || env.DATABASE_URL;
const sqlFile = process.argv[2];

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

if (!sqlFile) {
  console.error('SQL file not specified');
  process.exit(1);
}

async function runSql() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE,
        applied_at TIMESTAMP DEFAULT now()
      );
    `);

    const sqlFiles = process.argv.slice(2);
    
    for (const file of sqlFiles) {
      const fname = path.basename(file);
      
      const check = await client.query('SELECT 1 FROM migrations WHERE filename = $1', [fname]);
      if (check.rowCount > 0) {
        console.log(`Skipping already applied: ${fname}`);
        continue;
      }

      console.log(`Applying migration: ${fname}`);
      const sql = fs.readFileSync(file, 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [fname]);
      console.log(`Successfully executed ${fname}`);
    }
  } catch (err) {
    console.error(`Error executing migrations:`, err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSql();
