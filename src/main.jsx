import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// StrictMode 제거 → useEffect 두 번 실행 방지
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
