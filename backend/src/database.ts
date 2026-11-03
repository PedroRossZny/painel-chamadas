import { Pool } from 'pg';

let pool: Pool | undefined;

/** Single PostgreSQL pool shared by every service, configured by the DB_* variables. */
export function getPool(): Pool {
  pool ??= new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  return pool;
}
