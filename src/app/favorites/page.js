import styles from "./page.module.css";
import { getSession } from "@/app/lib/sessions";
import Header from "../components/Header";
import { db } from "@/app/lib/db";
import { signout } from "@/app/lib/signout"
import Link from "next/link";

export default async function Home() {
  const session = await getSession();
  let username = null;

  if (session) {
    const [rows] = await db.query("SELECT username FROM users WHERE id = ?", [session.user_id]);
    username = rows.length > 0 ? rows[0].username : null;
  }

  return (
    <div>
        <Header></Header>
    </div>
  );
}
