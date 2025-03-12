import mysql from "mysql2/promise";
import { db } from "@/app/lib/db"
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
        const [recRows] = await db.execute(
            "SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at, recommendation, report FROM stock_recommendation WHERE symbol = ? ORDER BY created_at DESC;",
            [symbol]
        );
        let recommendation = recRows.length > 0 ? recRows : null;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // if(!recommendation || new Date(recommendation[0].created_at) < oneHourAgo){
        if(!recommendation){
            console.log("Try.py Exec");

            exec(`python3 server/Try.py "${symbol}"`, (error, stdout, stderr) => {
                if(error){
                    console.error(`Try.py Error: ${stderr}`);
                } else {
                    console.log(`Try.py: ${stdout}`);
                    //Web Socket -> Client send Message
                    io.emit("db_updated", {symbol});
                }
            });

            return new Response(JSON.stringify({message: "새로운 추천 데이터를 생성 중입니다. Try Again Later."}), {status: 202});
        }

        if (recRows.length === 0) {
            return Response.json({ error: "해당 심볼의 추천 데이터를 찾을 수 없습니다." }, { status: 404 });
        }

        return Response.json(recommendation); // 모든 추천 정보를 배열로 반환
    } catch (error) {
        console.error("Database query error:", error);
        return Response.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}