import 'dotenv/config'
import pkg from 'pg'

const { Pool } = pkg

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'job_platform',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err)
})

export const query = (text, params) => pool.query(text, params)
export const getClient = () => pool.connect()
