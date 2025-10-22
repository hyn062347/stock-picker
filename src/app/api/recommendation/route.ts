import pool from "@/app/lib/db";
import { runAnalysis } from "@/app/api/rec_generate/route";

const SELECT_RECOMMENDATIONS_SQL = `
  SELECT
    id,
    symbol,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
    recommendation,
    score,
    report
  FROM stock_recommendation
  WHERE symbol = $1
  ORDER BY created_at DESC
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(SELECT_RECOMMENDATIONS_SQL, [symbol]);

    if (rows.length > 0) {
      return Response.json({ data: rows }, { status: 200 });
    }

    await runAnalysis(symbol);
    const { rows: refreshed } = await pool.query(SELECT_RECOMMENDATIONS_SQL, [symbol]);

    if (refreshed.length === 0) {
      return Response.json(
        { message: "추천 데이터를 생성했지만 결과를 찾을 수 없습니다." },
        { status: 500 }
      );
    }

    return Response.json(
      { message: "추천 데이터를 새로 생성했습니다.", data: refreshed },
      { status: 201 }
    );
  } catch (error) {
    console.error("[recommendation] Database or analysis error:", error);
    return Response.json({ error: "서버 오류 발생" }, { status: 500 });
  }
}
