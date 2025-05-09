import pool from "../lib/db";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

// 세션 생성
export async function createSession(userId) {
  const sessionId = randomUUID();
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // 1시간 후 만료

  await pool.query("INSERT INTO sessions (id, user_id, expires) VALUES (?, ?, ?)", [
    sessionId,
    userId,
    expires,
  ]);

  // 쿠키에 세션 ID 저장
  const cookieStore = await cookies();
  cookieStore.set("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return sessionId;
}

// 세션 연장
export async function refreshSession(sessionId) {
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // 1시간 연장

  await pool.query("UPDATE sessions SET expires = ? WHERE id = ?", [expires, sessionId]);
}

// 세션 확인
export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value; // ✅ get()을 동기적으로 호출
  if (!sessionId) return null;

  const [rows] = await pool.query("SELECT * FROM sessions WHERE id = ? AND expires > NOW()", [
    sessionId,
  ]);

  if (rows.length > 0) {
    // 사용자가 활동할 때마다 세션 연장
    await refreshSession(sessionId);
    return rows[0];
  }


  return null;
}

// 로그아웃 (세션 삭제)
export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;
  if (!sessionId) return;

  await pool.query("DELETE FROM sessions WHERE id = ?", [sessionId]);
  cookieStore.delete("sessionId");
}