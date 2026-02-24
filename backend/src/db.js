import 'dotenv/config'
import pkg from 'pg'

const { Pool } = pkg

// Support DATABASE_URL (e.g. postgresql://user:pass@host:5432/dbname) or separate PG* env vars.
// On macOS/Homebrew PostgreSQL the default superuser is often your system username, not "postgres".
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000 }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'job_platform',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      max: 10,
      idleTimeoutMillis: 30000,
    }

const pool = new Pool(config)

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err)
})

export const query = (text, params) => pool.query(text, params)
export const getClient = () => pool.connect()
