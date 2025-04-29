"use client"
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.css";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const router = useRouter();

  // ✅ 자동완성 API 호출 (디바운스 적용)
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/autocomplete?query=${query}`);
        const data = await response.json();
        setSuggestions(data.quotes || []);
      } catch (error) {
        console.error("Autocomplete fetch error:", error);
      } finally {
        setLoading(false);
      }
    }, 50); // 50ms 딜레이 적용
  }, [query]);

  // ✅ 검색어 제출 시 자동완성 목록의 첫 번째 항목 선택
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() === "") return;

    const selectedSymbol = suggestions.length > 0 ? suggestions[0].symbol : query;
    router.push(`/search?query=${encodeURIComponent(selectedSymbol)}`);
  };

  // ✅ 자동완성 목록에서 항목 선택
  const handleSelect = (symbol) => {
    setQuery(symbol);
    setSuggestions([]); // 선택 시 자동완성 목록 숨김
    router.push(`/search?query=${encodeURIComponent(symbol)}`);
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
      {/* ⏳ 로딩 표시 */}
      {loading && <div className={styles["loading"]}>Loading...</div>}
    </div>
  );
}