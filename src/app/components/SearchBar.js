"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.css";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if(query.trim() == "") return;
    
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className={styles["searchContainer"]}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="AAPL, TSLA, TSMC, ..."
        className={styles["searchField"]}
      />
      <button type="submit" className={styles["searchButton"]}>
        Search
      </button>
    </form>
  );
}