import styles from "./page.module.css";
import SearchBar from "./components/SearchBar";

export default function Home() {
  return (
    <div className={styles["main"]}>
      <h1 className={styles["title"]}>StockPicker</h1>
      <SearchBar/>
    </div>
  );
}
