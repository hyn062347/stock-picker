import mysql from "mysql2/promise";
import { db } from "@/app/lib/db"

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
        return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
    }

    try {
        // 2. stock_recommendation 테이블에서 추천 정보 가져오기
        const [recRows] = await db.execute(
            "SELECT created_at, recommendation, report FROM stock_recommendation WHERE symbol = ? ORDER BY created_at DESC",
            [symbol]
        );

        if (recRows.length === 0) {
            return Response.json({ error: "해당 심볼의 추천 데이터를 찾을 수 없습니다." }, { status: 404 });
        }

        return Response.json(recRows); // 모든 추천 정보를 배열로 반환
    } catch (error) {
        console.error("Database query error:", error);
        return Response.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}