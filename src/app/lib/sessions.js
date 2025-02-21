import { db } from "./db";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

// 세션 생성
export async function createSession(userId) {
  const sessionId = randomUUID();
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // 1시간 후 만료

  await db.query("INSERT INTO sessions (id, user_id, expires) VALUES (?, ?, ?)", [
    sessionId,
    userId,
    expires,
  ]);

  // 쿠키에 세션 ID 저장
  cookies().set("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return sessionId;
}

// 세션 확인
export async function getSession() {
  const sessionId = cookies().get("sessionId")?.value;
  if (!sessionId) return null;

  const [rows] = await db.query("SELECT * FROM sessions WHERE id = ? AND expires > NOW()", [
    sessionId,
  ]);

  return rows.length > 0 ? rows[0] : null;
}

// 로그아웃 (세션 삭제)
export async function destroySession() {
  const sessionId = cookies().get("sessionId")?.value;
  if (!sessionId) return;

  await db.query("DELETE FROM sessions WHERE id = ?", [sessionId]);
  cookies().delete("sessionId");
}