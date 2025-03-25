import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // waitForConnections: true,
  // connectionLimit: 10,  // ✅ 동시에 열 수 있는 최대 연결 수 설정
  // queueLimit: 0,
});

export default pool;