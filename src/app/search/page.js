"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import Header from "../components/Header";
import styles from "./page.module.css";
import dynamic from "next/dynamic";
import Markdown from "react-markdown";
import StockChart from "../components/StockChart";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const [stockData, setStockData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openReports, setOpenReports] = useState({});
  const [isFavorite, setIsFavorite] = useState(null);
  const [range, setRange] = useState("1M"); // 1M: 1 Month, 1Y: 1 Year, MAX: All

  useEffect(() => {
    async function fetchStockData() {
      if (!query) return;
      try {
        const response = await fetch(`/api/stock?symbol=${query}&range=${range}`);
        const data = await response.json();

        if (!data || data.error) {
          throw new Error(data.error || "데이터를 불러오지 못했습니다.");
        }
        setStockData(data);
      } catch (error) {
        console.error("Stock data fetch error:", error);
        setStockData(null);
      } finally {
        setLoading(false);
      }
    }

    async function fetchRecommendations() {
      if (!query) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/recommendation?symbol=${query}`);
        const data = await response.json();
        if (!data || data.error) throw new Error(data.error || "추천 정보를 불러오지 못했습니다.");
        setRecommendations(data);
      } catch (error) {
        console.error("Recommendation fetch error:", error);
        setRecommendations([]);
      }
      setLoading(false);
    }

    fetchStockData();
    fetchRecommendations();
  }, [query, range]);

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/favorite");

        if(response.status === 401) return;

        const favorites = await response.json();
        if (favorites.some(fav => fav.symbol === query)) {
          setIsFavorite(true);
        } else {
          setIsFavorite(false);
        }
      } catch (error) {
        console.error("즐겨찾기 조회 에러:", error);
      }
    }
    fetchFavorites();
  }, [query]);

  const formattedRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) {
      return [{ key: "loading", date: "", recommendation: "추천정보 로딩중. 약 2분 정도 소요됩니다.", report: "" }];
    }
    return recommendations.map((rec, index) => ({
      key: index,
      date: rec.created_at,
      recommendation: rec.recommendation,
      report: rec.report,
      className: rec.recommendation === "BUY" ? styles.buy :
        rec.recommendation === "HOLD" ? styles.hold :
          rec.recommendation === "SELL" ? styles.sell : ""
    }));
  }, [recommendations]);

  const toggleReport = (index) => {
    setOpenReports(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleToggleFavorite = async () => {
    if (!isFavorite) {
      try {
        const response = await fetch("/api/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: query }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        alert("즐겨찾기에 추가되었습니다!");
        setIsFavorite(true);
      } catch (error) {
        alert(error.message);
      }
    } else {
      try {
        const response = await fetch("/api/favorite", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: query }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        alert("즐겨찾기에서 제거되었습니다!");
        setIsFavorite(false);
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleRunTry = async () => {
    try {
      const response = await fetch("/api/run-try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: query }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      alert("Try.py 실행 요청 완료!");
    } catch (error) {
      alert("실행 오류: " + error.message);
    }
  };

  return (
    <div>
      <Header />
      <div className={styles.searchPage}>
        <div className={styles.pageTitle}>
          <h1>{query} / {stockData?.companyName || "Loading"}</h1>
          <div className={styles.buttonContainer}>
            {isFavorite === null ? (
              <></>
            ) : (
              <label className={styles.container}>
                <input type="checkbox" onChange={handleToggleFavorite} checked={isFavorite} />
                <svg
                  height="24px"
                  id="Layer_1"
                  version="1.2"
                  viewBox="0 0 24 24"
                  width="24px"
                  xmlSpace="preserve"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                >
                  <g>
                    <g>
                      <path d="M9.362,9.158c0,0-3.16,0.35-5.268,0.584c-0.19,0.023-0.358,0.15-0.421,0.343s0,0.394,0.14,0.521
                        c1.566,1.429,3.919,3.569,3.919,3.569c-0.002,0-0.646,3.113-1.074,5.19c-0.036,0.188,0.032,0.387,0.196,0.506
                        c0.163,0.119,0.373,0.121,0.538,0.028c1.844-1.048,4.606-2.624,4.606-2.624s2.763,1.576,4.604,2.625
                        c0.168,0.092,0.378,0.09,0.541-0.029c0.164-0.119,0.232-0.318,0.195-0.505c-0.428-2.078-1.071-5.191-1.071-5.191
                        s2.353-2.14,3.919-3.566c0.14-0.131,0.202-0.332,0.14-0.524s-0.23-0.319-0.42-0.341c-2.108-0.236-5.269-0.586-5.269-0.586
                        s-1.31-2.898-2.183-4.83c-0.082-0.173-0.254-0.294-0.456-0.294s-0.375,0.122-0.453,0.294C10.671,6.26,9.362,9.158,9.362,9.158z" />
                    </g>
                  </g>
                </svg>
              </label>
            )}
            <button type="button" className={styles.button} onClick={handleRunTry}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-arrow-repeat"
                viewBox="0 0 16 16"
              >
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                <path
                  fillRule="evenodd"
                  d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <div className={styles.rangeButtons}>
          <button onClick={() => setRange("1M")} className={`${styles.rangeButton} ${range === "1M" ? styles.active : styles.inactive}`}>1개월</button>
          <button onClick={() => setRange("1Y")} className={`${styles.rangeButton} ${range === "1Y" ? styles.active : styles.inactive}`}>1년</button>
          <button onClick={() => setRange("MAX")} className={`${styles.rangeButton} ${range === "MAX" ? styles.active : styles.inactive}`}>전체</button>
        </div>
        {stockData ? (
          <div>
            <p>현재 가격: {stockData.currentPrice}</p>
            <p>시작가: {stockData.openPrice}</p>
            <p>종가: {stockData.closePrice}</p>
            <div className={styles.chartContainer}>
              <StockChart data={stockData.chartData} recommendations={formattedRecommendations} />
            </div>
          </div>
        ) : (
          <div>
            <p>현재 가격: 로딩중...</p>
            <p>시작가: 로딩중...</p>
            <p>종가: 로딩중...</p>
            <div className={styles.loadingPlaceholder}></div>
          </div>
        )}
        {formattedRecommendations.length > 0 ? (
          formattedRecommendations.map((rec) => (
            <div key={rec.key} className={styles.recommendation}>
              <div className={styles.recTitle}>
                <p className={rec.className}>{rec.date} {rec.recommendation}</p>
                <button className={styles.viewButton} onClick={() => toggleReport(rec.key)}>
                  {openReports[rec.key] ? "Hide" : "Open"}
                </button>
              </div>
              <div className={`${styles.report} ${openReports[rec.key] ? styles.open : ""}`}>
                <Markdown>{rec.report}</Markdown>
              </div>
            </div>
          ))
        ) : (
          <p>추천정보 로딩중. 약 2분 정도 소요됩니다.</p>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}