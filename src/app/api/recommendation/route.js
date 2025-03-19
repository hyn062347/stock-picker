import mysql from "mysql2/promise";
import pool from "@/app/lib/db"
import { exec } from "child_process"
import { stdout } from "process";
import { io } from "../../../../server/socket";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
        return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
    }

    try {
        // 2. stock_recommendation 테이블에서 추천 정보 가져오기
        const [recRows] = await pool.execute(
            "SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at, recommendation, report FROM stock_recommendation WHERE symbol = ? ORDER BY created_at DESC;",
            [symbol]
        );
        let recommendation = recRows.length > 0 ? recRows : null;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 60 * 60 * 1000 * 24);
        const oneWeekAgo = new Date(Date.now() - 3600 * 1000 * 24 * 7);

        if (!recommendation) {
            // 기존 데이터가 없을 경우, 새 데이터 생성 후 202 응답
            console.log("추천 데이터 없음, Try.py 실행");
            exec(`python3 server/Try.py "${symbol}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Try.py Error: ${stderr}`);
                } else {
                    console.log(`Try.py 실행 결과: ${stdout}`);
                    io.emit("pool_updated", { symbol });
                }
            });
            return Response.json([]); // 빈 배열 반환하여 오류 방지
        } 
        else if (new Date(recommendation[0].created_at) < oneWeekAgo) {
            // 데이터가 오래된 경우, 기존 데이터를 반환하면서 Try.py 실행
            console.log("추천 데이터 오래됨, Try.py 실행");
            exec(`python3 server/Try.py "${symbol}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Try.py Error: ${stderr}`);
                } else {
                    console.log(`Try.py 실행 결과: ${stdout}`);
                    io.emit("pool_updated", { symbol });
                }
            });
        }
        return Response.json(recommendation); // 모든 추천 정보를 배열로 반환
    } catch (error) {
        console.error("Database query error:", error);
        return Response.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}