"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import io from "socket.io-client";
import Header from "../components/Header";
import styles from "./page.module.css";
import dynamic from "next/dynamic";
import Markdown from "react-markdown";

const LineChart = dynamic(() => import("../components/StockChart"), { ssr: false });
export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const [stockData, setStockData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openReports, setOpenReports] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    // let socket;

    async function fetchStockData() {
      if (!query) return;
      try {
        const response = await fetch(`/api/stock?symbol=${query}`);
        const data = await response.json();

        console.log(data);
        if (!data || data.error) {
          throw new Error(data.error || "데이터를 불러오지 못했습니다.");
        }

        setStockData(data);
      } catch (error) {
        console.error("Stock data fetch error:", error);
        setStockData(null);
      }
    }

    async function fetchRecommendations() {
      if (!query) return;
      setLoading(true);
      try {
        const response = await fetch(`./api/recommendation?symbol=${query}`);
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

    // socket = io("http://localhost:4000");
    // socket.on("db_updated", (data) => {
    //   console.log("새로운 추천 데이터 수신:", data);
    //   if (data.symbol === query) {
    //     fetchRecommendations(); // 새로운 데이터가 추가되었을 때 즉시 업데이트
    //   }
    // });
    // return () => {
    //   if (socket) socket.disconnect();
    // };
  }, [query]);

  const formattedRecommendations = useMemo(() => {
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

  //각 index 마다 useState
  const toggleReport = (index) => {
    setOpenReports((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAddToFavorites = async () => {
    try {
      const response = await fetch("/api/favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol: query }),
      });
  
      const result = await response.json();
      if (result.error) throw new Error(result.error);
  
      alert("즐겨찾기에 추가되었습니다!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <Header />
      <div className={styles["searchPage"]}>
        <div className={styles["pageTitle"]}>
          <h1>{query} / {stockData?.companyName || "Loading"}</h1>
          <button  onClick={handleAddToFavorites}>Add to Favoirtes</button>
        </div>
        {stockData ? (
          <div>
            <p>현재 가격: {stockData.currentPrice}</p>
            <p>오늘 시작가: {stockData.openPrice}</p>
            <p>오늘 종가: {stockData.closePrice}</p>
            <div className={styles["chartContainer"]}>
              <LineChart data={stockData.chartData} />
            </div>
          </div>
        ) : (
          <p>로딩 중...</p>
        )}
        {formattedRecommendations.length > 0 ? (
          formattedRecommendations.map((rec) => (
            <div key={rec.key} className={styles["recommendation"]}>
              <div className={styles["recTitle"]}>
                <p className={rec.className}>{rec.date} {rec.recommendation}</p>
                <button className={styles["viewButton"]} onClick={() => toggleReport(rec.key)}>{openReports[rec.key] ? "Hide" : "Open"}</button>
              </div>
              {openReports[rec.key] && (  // 이 부분을 수정
                <div className={styles["report"]}>
                  <Markdown>{rec.report}</Markdown>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>추천정보 로딩중. 약 2분 정도 소요됩니다.</p>
        )}
      </div>
    </div>
  );
}