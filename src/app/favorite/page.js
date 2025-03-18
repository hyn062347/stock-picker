"use client";
import styles from "./page.module.css";
import Header from "../components/Header";
import { useEffect, useState } from "react";
import MiniChart from "../components/miniChart";
import { useRouter } from "next/navigation";

export default function FavoriteStocks() {
  const [favorites, setFavorites] = useState([]);
  const [stockData, setStockData] = useState({});
  const router = useRouter();

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch("/api/favorite"); // GET 요청
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setFavorites(data);
      } catch (error) {
        console.error("즐겨찾기 불러오기 오류:", error);
      }
    }
    fetchFavorites();
  }, []);

  useEffect(() => {
    async function fetchStockData() {
      if (favorites.length === 0) return;

      try {
        const symbols = favorites.map(stock => stock.symbol).join(","); // 심볼을 콤마로 연결
        const response = await fetch(`/api/ministock?symbols=${symbols}`);
        const data = await response.json();
        if (!data || data.error) throw new Error(data.error);

        setStockData(data); // 전체 데이터 저장
      } catch (error) {
        console.error("Stock data fetch error:", error);
      }
    }

    fetchStockData();
  }, [favorites]);

  const truncateName = (name, maxLength = 35) => {
    return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
  };

  return (
    <div>
      <Header></Header>
      <div className={styles["ContentContainer"]}>
        <h1 className={styles["title"]}>Favorite Stocks</h1>
        <div className={styles["stockList"]}>
          {favorites.map((stock) => (
            <div key={stock.symbol}
              className={styles["stockItem"]}
              onClick={() => router.push(`/search?query=${stock.symbol}`)} // ✅ 클릭 시 이동
              style={{ cursor: "pointer" }} // ✅ 마우스 커서를 손 모양으로 변경
            >
              <h2 className={styles["overflow"]}>{stock.symbol}</h2>
              <p>{truncateName(stockData[stock.symbol]?.companyName || "Loading...", 35)}</p>
              {stockData[stock.symbol] ? (
                <MiniChart data={stockData[stock.symbol]?.chartData || []} />
              ) : (
                <div>
                  <div className={styles["loadingPlaceholder"]}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
