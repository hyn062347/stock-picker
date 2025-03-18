import pool from "@/app/lib/db"
import bcrypt from "bcryptjs";
import { createSession } from "@/app/lib/sessions";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
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