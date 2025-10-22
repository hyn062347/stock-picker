export async function POST(req) {
    try {
        const { symbol } = await req.json();
        if (!symbol) {
            return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
        }

        const recUrl = new URL("/api/rec_generate", req.url);
        const response = await fetch(recUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol }),
        });

        const payload = await response.json();
        return Response.json(payload, { status: response.status });
    } catch (error) {
        console.error("서버 오류:", error);
        return Response.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}
