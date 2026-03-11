import { Routes, Route, Link, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";

export default function App() {
  return (
    <div className="page">
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <span>VirtuDent</span>
            <span className="badge">Virtual Dental Patient</span>
          </div>
        </div>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/chat/:sessionId" element={<ChatPage />} />
      </Routes>
    </div>

    </div>
  );
}
