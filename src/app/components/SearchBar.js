"use client"
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.css";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const router = useRouter();

  // ✅ 자동완성 API 호출
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/autocomplete?query=${query}`);
        const data = await response.json();
        setSuggestions(data.quotes || []);
      } catch (error) {
        console.error("Autocomplete fetch error:", error);
      }
    };

    fetchSuggestions();
  }, [query]);

  const handleSelect = (symbol) => {
    setQuery(symbol);
    router.push(`/search?query=${encodeURIComponent(symbol)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() == "") return;

    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  return (
    <div>
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

      {/* ✅ 자동완성 목록 표시 */}
      {suggestions.length > 0 && (
        <ul className={styles["suggestionsList"]}>
          {suggestions.map((item) => (
            <li key={item.symbol} onClick={() => handleSelect(item.symbol)}>
              {item.symbol} - {item.shortname || item.longname}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}