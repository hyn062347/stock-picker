import pool from "@/app/lib/db"
import bcrypt from "bcryptjs";
import { createSession } from "@/app/lib/sessions";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    // PostgreSQL에 맞게 자리 표시자를 $1로 변경하고 결과에서 rows를 추출합니다.
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const rows = result.rows;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 401 });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
    }

    await createSession(user.id);

    return new Response(JSON.stringify({ message: "Login successful!" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}