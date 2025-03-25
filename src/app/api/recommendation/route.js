import pool from "@/app/lib/db";
import { exec } from "child_process";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
  }

  try {
    // PostgreSQL용으로 쿼리 수정 (DATE_FORMAT → to_char, 자리표시자 변경)
    const result = await pool.query(
      "SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at, recommendation, report FROM stock_recommendation WHERE symbol = $1 ORDER BY created_at DESC;",
      [symbol]
    );
    const recRows = result.rows;
    let recommendation = recRows.length > 0 ? recRows : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 60 * 60 * 1000 * 24);
    const oneWeekAgo = new Date(Date.now() - 3600 * 1000 * 24 * 7);

    if (!recommendation) {
      // 데이터가 없을 경우, Try.py 실행
      console.log("추천 데이터 없음, Try.py 실행");
      exec(`python3 server/Try.py "${symbol}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Try.py Error: ${stderr}`);
        } else {
          console.log(`Try.py 실행 결과: ${stdout}`);
        }
      });
      return Response.json([]); // 빈 배열 반환
    } else if (new Date(recommendation[0].created_at) < oneWeekAgo) {
      // 데이터가 오래된 경우, 기존 데이터 반환 후 Try.py 실행
      console.log("추천 데이터 오래됨, Try.py 실행");
      exec(`python3 server/Try.py "${symbol}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Try.py Error: ${stderr}`);
        } else {
          console.log(`Try.py 실행 결과: ${stdout}`);
        }
      });
    }
    return Response.json(recommendation);
  } catch (error) {
    console.error("Database query error:", error);
    return Response.json({ error: "서버 오류 발생" }, { status: 500 });
  }
}