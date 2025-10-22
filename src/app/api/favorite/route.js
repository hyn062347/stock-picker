import pool from "@/app/lib/db";
import { getSession } from "@/app/lib/sessions";

export async function POST(req) {
  try {
    // 현재 세션 확인
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), { status: 401 });
    }

    const userId = session.user_id;
    const { symbol } = await req.json();

    if (!symbol) {
      return new Response(JSON.stringify({ error: "심볼 값이 필요합니다." }), { status: 400 });
    }

    // 중복된 즐겨찾기 방지
    const { rows: existing } = await pool.query(
      "SELECT * FROM favorite WHERE user_id = $1 AND symbol = $2",
      [userId, symbol]
    );

    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: "이미 즐겨찾기에 추가된 주식입니다." }), { status: 400 });
    }

    // 즐겨찾기 추가
    await pool.query("INSERT INTO favorite (user_id, symbol) VALUES ($1, $2)", [userId, symbol]);

    return new Response(JSON.stringify({ message: "즐겨찾기에 추가되었습니다!" }), { status: 201 });
  } catch (error) {
    console.error("즐겨찾기 추가 오류:", error);
    return new Response(JSON.stringify({ error: "서버 오류 발생" }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), { status: 401 });
    }
    const userId = session.user_id;
    const { rows: favorites } = await pool.query("SELECT symbol FROM favorite WHERE user_id = $1", [userId]);
    return new Response(JSON.stringify(favorites), { status: 200 });
  } catch (error) {
    console.error("즐겨찾기 조회 오류:", error);
    return new Response(JSON.stringify({ error: "서버 오류 발생" }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), { status: 401 });
    }
    const userId = session.user_id;
    const { symbol } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "심볼 값이 필요합니다." }), { status: 400 });
    }
    await pool.query("DELETE FROM favorite WHERE user_id = $1 AND symbol = $2", [userId, symbol]);
    return new Response(JSON.stringify({ message: "즐겨찾기에서 제거되었습니다!" }), { status: 200 });
  } catch (error) {
    console.error("즐겨찾기 삭제 오류:", error);
    return new Response(JSON.stringify({ error: "서버 오류 발생" }), { status: 500 });
  }
}
