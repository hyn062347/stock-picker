import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Customized
} from "recharts";
import styles from "./StockChart.module.css";

// Customized에서 사용할 '마커 전용' 컴포넌트
function CustomMarkers(props) {
  const {
    data,            // 차트에 쓰이는 data (movingAverageData)
    recommendations, // 추천 배열
    xAxisMap,
    yAxisMap,
    width,
    height
    // ...기타 props (offset, xAxis, yAxis 등)도 들어오지만 여기서는 사용 X
  } = props;

  // console.log(props.yAxisMap);
  // console.log(props.xAxisMap);

  const xAxis = xAxisMap["0"];
  const yAxisLeft = yAxisMap["left"];

  const xScale = xAxis.scale;         // X축 범주형(scaleBand) 또는 scalePoint
  const yScale = yAxisLeft.scale;     // 왼쪽 Y축 (가격용)

  // recommendations.map으로 각 추천에 대한 마커(circle)를 만듭니다.
  return (
    <g>
      {recommendations.map((rec, idx) => {
        // rec.date(문자열)를 Date로
        const recTime = new Date(rec.date).getTime();

        // 1) data에서 recTime과 가장 가까운 시점 찾기
        let closestIndex = 0;
        let minDiff = Infinity;

        data.forEach((d, i) => {
          // 각 데이터의 time도 숫자로 비교하기 위해 getTime()
          const dTime = new Date(d.time).getTime();
          const diff = Math.abs(dTime - recTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        });

        // 2) 가장 가까운 data[closestIndex]를 가져옴
        const matchedData = data[closestIndex];
        console.log(matchedData);

        // 3) xScale, yScale을 통해 픽셀 좌표 계산
        //    - 범주형(category) 스케일에서는 xScale(matchedData.time)이
        //      “closestIndex에 해당하는 축 위치”로 매핑됩니다.
        const x =
          xScale(matchedData.time) +
          (typeof xScale.bandwidth === "function" ? xScale.bandwidth() / 2 : 0);
        const y = yScale(matchedData.price);

        // 차트 범위를 벗어났으면 표시하지 않음
        if (x < 0 || x > width || y < 0 || y > height) {
          return null;
        }

        // recommendation에 따라 색상
        let color = "orange";
        if (rec.recommendation === "BUY") color = "green";
        else if (rec.recommendation === "SELL") color = "red";
        // HOLD 등은 gray 그대로

        return (
          <g key={rec.Key ?? idx}>
            {/* 마커 (원) */}
            <circle cx={x} cy={y} r={6} fill={color} />
            {/* 마커 라벨 (텍스트) */}
            <text
              x={x + 20}
              y={y - 10}
              textAnchor="middle"
              fill={color}
              fontSize={12}
            >
              {rec.recommendation}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default function StockChart({ data, recommendations }) {
  if (!data || data.length === 0) return <p>데이터 없음</p>;

  // console.log("recommendations:", recommendations);
  // console.log("data:", data);

  // ✅ 이동 평균(SMA) 계산 (5일 이동 평균)
  const movingAverageData = data.map((item, index, arr) => {
    const range = arr.slice(Math.max(0, index - 4), index + 1); // 최근 5개
    const avgPrice = range.reduce((sum, d) => sum + d.price, 0) / range.length;
    return {
      ...item,
      movingAverage: avgPrice
    };
  });

  // ✅ 툴팁 커스텀 렌더링 함수 (거래량 추가)
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const priceData = payload.find((p) => p.dataKey === "price");
    const movingAvgData = payload.find((p) => p.dataKey === "movingAverage");
    const volumeData = payload.find((p) => p.dataKey === "volume");

    const dateObj = new Date(payload[0].payload.time);

    return (
      <div style={{ backgroundColor: "black", padding: "10px", color: "white", borderRadius: "5px" }}>
        <p>
          <strong>
            {dateObj.toLocaleDateString("ko-KR")}{" "}
            {dateObj.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </strong>
        </p>
        {priceData && <p>주가: {priceData.value.toFixed(2)}</p>}
        {movingAvgData && <p>이동 평균: {movingAvgData.value.toFixed(2)}</p>}
        {volumeData && <p>거래량: {volumeData.value.toLocaleString()} 주</p>}
      </div>
    );
  };

  // ✅ 거래량 단위를 K(천), M(백만) 단위로 변환
  const formatVolume = (value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value;
  };

  return (
    <div className={styles["ChartContainer"]}>
      <ResponsiveContainer>
        <ComposedChart data={movingAverageData}>
          {/* X축 (범주형) */}
          <XAxis
            dataKey="time"
            tickFormatter={(time) => {
              // time이 문자열이면 Date 변환
              if (!(time instanceof Date)) time = new Date(time);
              const month = (time.getMonth() + 1).toString().padStart(2, "0");
              const day = time.getDate().toString().padStart(2, "0");
              return `${month}/${day}`; // MM-DD
            }}
          />
          {/* Y축들 */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={["auto", "auto"]}
            tickFormatter={formatVolume}
          />
          <YAxis yAxisId="left" domain={["auto", "auto"]} />

          {/* 시리즈들 */}
          <Bar yAxisId="right" dataKey="volume" fill="#00BB00" name="거래량" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            name="주가"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="movingAverage"
            stroke="#FF5733"
            strokeWidth={2}
            dot={false}
            name="5일 이동 평균"
          />

          {/* Customized로 직접 마커 그리기 */}
          <Customized
            component={(props) => (
              <CustomMarkers
                {...props}
                data={movingAverageData}
                recommendations={recommendations}
              />
            )}
          />

          <Tooltip content={renderTooltip} />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
