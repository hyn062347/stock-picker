import { Server } from "socket.io";
import http from "http";

const PORT = 4000; // Next.js가 실행되는 포트와 다르게 설정

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // 필요에 따라 도메인 설정 가능
  },
});

io.on("connection", (socket) => {
  console.log("🛜 클라이언트가 WebSocket에 연결됨");

  socket.on("disconnect", () => {
    console.log("❌ 클라이언트 연결 해제됨");
  });
});

// Web Socket이 외부에서 접근 가능해야함.
export { io };

// 서버 실행
// server.listen(PORT, () => {
//   console.log(`🚀 WebSocket 서버가 ${PORT} 포트에서 실행 중`);
// });