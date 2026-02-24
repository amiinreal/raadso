import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to database");

        const schemaFile = path.resolve('project_raadso/backend/sql/schema.sql');
        const schemaSql = fs.readFileSync(schemaFile, 'utf8');

        console.log("Running schema.sql...");
        await client.query(schemaSql);
        console.log("schema.sql completed");

        // Add other migrations if needed
        const translationSeedFile = path.resolve('project_raadso/backend/sql/seeds/translation_seed.sql');
        if (fs.existsSync(translationSeedFile)) {
             console.log("Running translation_seed.sql...");
             const seedSql = fs.readFileSync(translationSeedFile, 'utf8');
             await client.query(seedSql);
             console.log("translation_seed.sql completed");
        }

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
