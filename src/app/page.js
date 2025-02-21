import styles from "./page.module.css";
import SearchBar from "./components/SearchBar";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles["main"]}>
      <h1 className={styles["title"]}>StockPicker</h1>
      <SearchBar/>
      <div>
      <Link href="/signup" className="text-blue-500 underline">
        SignUp
      </Link>
      <Link href="/signin" className="text-blue-500 underline">
        SignIn
      </Link>
      </div>
    </div>
  );
}
