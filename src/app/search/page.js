"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import io from "socket.io-client"
import Header from "../components/Header"
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


  useEffect(() => {
    let socket;
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

    socket = io("http://localhost:4000");
    socket.on("db_updated", (data) => {
      console.log("새로운 추천 데이터 수신:", data);
      if (data.symbol === query) {
        fetchRecommendations(); // 새로운 데이터가 추가되었을 때 즉시 업데이트
      }
    });
    return () => {
      if (socket) socket.disconnect();
    };
  }, [query]);

  return (
    <div>
      <Header />
      <div className={styles["searchPage"]}>
        <h1>{query} / {stockData?.companyName || "Loading"}</h1>
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
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <div key={index} className={styles["recommendation"]}>
              <p><strong>{rec.created_at}</strong></p>
              <p><strong>{rec.recommendation}</strong></p>
              <div className={styles["report"]}><Markdown>{rec.report}</Markdown></div>
            </div>
          ))
        ) : (
          <p>추천정보 로딩중. 약 2분 정도 소요됩니다.</p>
        )}
      </div>
    </div>
  );
}