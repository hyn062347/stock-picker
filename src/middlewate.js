import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function middleware(req) {
  const session = await getSession();
  const url = req.nextUrl.clone();

  if (!session && url.pathname.startsWith("/dashboard")) {
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"], // 보호해야 할 페이지 경로
};