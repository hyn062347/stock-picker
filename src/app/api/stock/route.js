import yahooFinance from "yahoo-finance2";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return new Response(JSON.stringify({ error: "No stock symbol provided" }), { status: 400 });
  }

  try {

    // ✅ 주식 기본 정보 가져오기 (거래량 포함)
    const quote = await yahooFinance.quote(symbol);

    const range = searchParams.get("range") || "1M";
    const now = new Date();
    let period1;

    if (range === "1Y") {
      period1 = new Date(now);
      period1.setFullYear(period1.getFullYear() - 1);
    } else if (range === "MAX") {
      period1 = new Date("2000-01-01"); // 대략적인 최대 기간 시작일
    } else {
      period1 = new Date(now);
      period1.setDate(period1.getDate() - 30);
    }

    // ✅ 하루 단위(`1d`)로 기간에 따른 데이터를 요청
    const chartData = await yahooFinance.chart(symbol, {
      period1: period1.toISOString().split("T")[0], // YYYY-MM-DD 형식
      interval: "1d", // 하루 단위
    });

    // ✅ API 응답 데이터 구조 확인 (디버깅용)
    // console.log("Yahoo Finance API Response:", chartData);

    // ✅ `quotes` 배열이 없을 경우 에러 처리
    if (!chartData || !chartData.quotes || chartData.quotes.length === 0) {
      console.error("Yahoo Finance API Error: 차트 데이터 없음", chartData);
      throw new Error("차트 데이터를 가져오지 못했습니다.");
    }

    // ✅ 거래량 데이터를 `indicators.volume`에서 가져오기
    const volumeData = chartData.indicators?.volume ? chartData.indicators.volume[0] : null;

    // ✅ `quotes` 배열을 사용하여 차트 데이터 변환
    const formattedChartData = chartData.quotes.map((q, index) => ({
      time: new Date(q.date), // 날짜 변환
      price: q.close, // 종가 사용
      volume: volumeData ? volumeData[index] || 0 : q.volume || 0, // ✅ 거래량 추가
    }));

    return new Response(JSON.stringify({
      symbol: quote.symbol, // ✅ 주식 심볼
      companyName: quote.longName || quote.shortName || "Unknown", // ✅ 회사 이름 추가
      currentPrice: quote.regularMarketPrice,
      openPrice: quote.regularMarketOpen,
      closePrice: quote.regularMarketPreviousClose,
      chartData: formattedChartData,
    }), { status: 200 });
  } catch (error) {
    console.error("Yahoo Finance API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch stock data" }), { status: 500 });
  }
}