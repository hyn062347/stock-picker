import yahooFinance from "yahoo-finance2";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols"); // 여러 개의 심볼을 받음

  if (!symbols) {
    return new Response(JSON.stringify({ error: "No stock symbols provided" }), { status: 400 });
  }

  try {
    const symbolList = symbols.split(",");
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 30);

    // 여러 개의 심볼을 동시에 요청하여 속도 개선
    const stockDataPromises = symbolList.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        const chartData = await yahooFinance.chart(symbol, {
          period1: oneWeekAgo.toISOString().split("T")[0],
          interval: "1d",
        });

        if (!chartData || !chartData.quotes || chartData.quotes.length === 0) {
          console.error(`Yahoo Finance API Error: 차트 데이터 없음 (${symbol})`);
          return { [symbol]: [] };
        }

        return {
          [symbol]: {
            companyName: quote.longName || quote.shortName || "Unknown",  // ✅ 회사 이름 추가
            chartData: chartData.quotes.map(q => ({
              time: new Date(q.date),
              price: q.close,
            }))
          }
        };
      } catch (error) {
        console.error(`Yahoo Finance API Error (${symbol}):`, error);
        return { [symbol]: [] };
      }
    });

    const stockDataArray = await Promise.all(stockDataPromises);
    const stockData = Object.assign({}, ...stockDataArray); // 객체 병합

    return new Response(JSON.stringify(stockData), { status: 200 });
  } catch (error) {
    console.error("Yahoo Finance API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch stock data" }), { status: 500 });
  }
}