import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis, Tooltip } from "recharts";
import styles from "./miniChart.module.css";

export default function MiniChart({ data }) {
    // console.log("Renderding", data);
    if (!data || data.length === 0) return <p>데이터 없음</p>;

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;
    
        const date = new Date(payload[0].payload.time);
        const formattedDate = date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "/").replace(/\.$/, "");
        const formattedTime = date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
    
        return (
            <div className={styles["tooltip"]}>
                <p>{formattedDate} {formattedTime}</p>
                <p style={{ color: "#8884d8" }}>price : {payload[0].value.toFixed(2)}</p>
            </div>
        );
    };

    return (
        <div className={styles["ChartContainer"]}>
            <ResponsiveContainer>
                <AreaChart data={data}>
                    <XAxis dataKey="time" tickFormatter={time => new Date(time).toLocaleDateString()} hide={true}/>
                    <YAxis domain={["auto", "auto"]} hide={true}/>
                    <Area type="monotone" dataKey="price" stroke="#8884d8" fill="#8884d8" />
                    <Tooltip content={<CustomTooltip />}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}