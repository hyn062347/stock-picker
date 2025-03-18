import styles from "./page.module.css";
import SearchBar from "./components/SearchBar";
import { getSession } from "@/app/lib/sessions";
import pool from "./lib/db"
import { signout } from "@/app/lib/signout"
import Link from "next/link";

export default async function Home() {
  const session = await getSession();
  let username = null;

  if (session) {
    const [rows] = await pool.query("SELECT username FROM users WHERE id = ?", [session.user_id]);
    username = rows.length > 0 ? rows[0].username : null;
  }

  return (
    <div className={styles["main"]}>
      <div className={styles["margintop"]}>
        <h1 className={styles["title"]}>StockPicker</h1>
        <SearchBar />
        {username ? (
          <div className={styles["user"]}>
            <div className={styles["flexrow"]}>
              <h2>Welcome, {username}!</h2>
              <form action={signout}>
                <button className={styles["outButton"]} type="submit">
                  Sign Out
                </button>
              </form>
            </div>
            <div className={styles["Favorites"]}>
              <Link href="/favorite">
                <h2>Favorite Stocks</h2>
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles["sign"]}>
            <Link href="/signup">
              SignUp
            </Link>
            <Link href="/signin">
              SignIn
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
