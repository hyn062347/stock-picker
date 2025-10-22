import { runAnalysis } from "./service";

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return Response.json({ error: "symbol이 제공되지 않았습니다." }, { status: 400 });
    }

    const result = await runAnalysis(symbol);
    return Response.json({ message: "추천 데이터 생성 완료", data: result.recommendation }, { status: 200 });
  } catch (error) {
    console.error("[rec_generate] Failed to generate recommendation:", error);
    return Response.json({ error: "추천 데이터 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
