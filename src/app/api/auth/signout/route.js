import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return new Response(JSON.stringify({ message: "Logged out" }), { status: 200 });
}