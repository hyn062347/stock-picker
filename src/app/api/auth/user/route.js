import pool from "@/app/lib/db";
import { getSession } from "@/app/lib/sessions";

export async function GET() {
    try {
      const session = await getSession();
      if (!session) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
  
      const { rows } = await pool.query("SELECT username FROM users WHERE id = $1", [session.user_id]);
      if (rows.length === 0) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
      }
  
      return new Response(JSON.stringify({ user: rows[0].username }), { status: 200 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }
