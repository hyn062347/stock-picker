export async function GET() {
  return Response.json(
    { message: "이 경로는 직접 호출할 수 없습니다." },
    { status: 405 }
  );
}
