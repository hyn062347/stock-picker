"use client";
import styles from "./page.module.css";
import Header from "../components/Header";
import { useEffect, useState } from "react";

export default function FavoriteStocks() {
  const [favoites, setFavorites] = useState([]);

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

  return (
    <div>
      <Header></Header>
      <h1>My Favorites</h1>
    </div>
  );
}
