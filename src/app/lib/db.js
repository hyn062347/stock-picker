import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("Missing PostgreSQL connection string. Set POSTGRES_URL or DATABASE_URL in .env.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=no-verify")
    ? undefined
    : {
        rejectUnauthorized: false,
      },
});

export default pool;

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}
