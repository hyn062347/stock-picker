"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../components/Header"
import styles from "./page.module.css";
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import("../components/StockChart"), { ssr: false });

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const [stockData, setStockData] = useState(null);

  useEffect(() => {
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

    fetchStockData();
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
      </div>
    </div>
  );
}