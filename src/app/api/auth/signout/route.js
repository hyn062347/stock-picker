import { destroySession } from "@/app/lib/sessions";

export async function POST() {
  await destroySession();
  return new Response(JSON.stringify({ message: "Logged out" }), { status: 200 });
}