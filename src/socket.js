// client/src/socket.js
import { io } from "socket.io-client";

// 🚀 Render 서버 주소로 연결 (내 서버 주소)
export const socket = io("https://chocbear.onrender.com", {
  transports: ["websocket"],
});
