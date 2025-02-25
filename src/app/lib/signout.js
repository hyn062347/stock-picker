"use server";
import { destroySession } from "@/app/lib/sessions";
import { redirect } from "next/navigation";

export async function signout() {
  await destroySession();
  redirect("/"); // 로그아웃 후 홈페이지로 이동
}