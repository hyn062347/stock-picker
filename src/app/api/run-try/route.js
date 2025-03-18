import { exec } from "child_process"

export async function POST(req) {
    try {
        const { symbol } = await req.json();
        if (!symbol) {
            return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
        }

        console.log("Try.py 실행 요청:", symbol);
        exec(`python3 server/Try.py "${symbol}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Try.py 실행 오류: ${stderr}`);
            } else {
                console.log(`Try.py 실행 결과: ${stdout}`);
            }
        });

        return Response.json({ message: "Try.py 실행 요청 완료!" });
    } catch (error) {
        console.error("서버 오류:", error);
        return Response.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}