import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import styles from "./StockChart.module.css";

export default function StockChart({ data }) {
  if (!data || data.length === 0) return <p>데이터 없음</p>;

  // ✅ 이동 평균(SMA) 계산 (5일 이동 평균)
  const movingAverageData = data.map((item, index, arr) => {
    const range = arr.slice(Math.max(0, index - 4), index + 1); // 최근 5개 데이터
    const avgPrice = range.reduce((sum, d) => sum + d.price, 0) / range.length;
    return { ...item, movingAverage: avgPrice };
  });

  // ✅ 툴팁 커스텀 렌더링 함수 (거래량 추가)
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    console.log("Tooltip payload:", payload); // ✅ 디버깅용 로그

    // ✅ 주가, 이동 평균, 거래량 값 찾기
    const priceData = payload.find((p) => p.dataKey === "price");
    const movingAvgData = payload.find((p) => p.dataKey === "movingAverage");
    const volumeData = payload.find((p) => p.dataKey === "volume");

    return (
      <div style={{ backgroundColor: "white", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
        <p><strong>{new Date(payload[0].payload.time).toLocaleDateString("ko-KR")} {new Date(payload[0].payload.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}</strong></p>
        {priceData && <p>주가: {priceData.value.toFixed(2)}</p>}
        {movingAvgData && <p>이동 평균: {movingAvgData.value.toFixed(2)}</p>}
        {volumeData && <p>거래량: {volumeData.value.toLocaleString()} 주</p>}
      </div>
    );
  };

  return (
    <div className={styles["ChartContainer"]}>
      <ResponsiveContainer className={styles["chartcco"]}>
        <ComposedChart data={movingAverageData}>
          {/* X축 */}
          <XAxis
            dataKey="time"
            tickFormatter={(time) => {
              if (!(time instanceof Date)) time = new Date(time);
              return time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
            }}
          />
          {/* 왼쪽 Y축 (주가) */}
          <YAxis yAxisId="left" domain={["auto", "auto"]} />
          <Line yAxisId="left" type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} dot={false} name="주가" />
          {/* ✅ 이동 평균선 */}
          <Line yAxisId="left" type="monotone" dataKey="movingAverage" stroke="#FF5733" strokeWidth={2} dot={false} name="5일 이동 평균" />
          {/* 오른쪽 Y축 (거래량) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={["auto","auto"]}
          />
          <Tooltip content={renderTooltip} />
          <Legend />
          {/* ✅ 거래량 막대 차트를 먼저 선언 */}
          <Bar yAxisId="right" dataKey="volume" fill="#82ca9d" name="거래량" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}