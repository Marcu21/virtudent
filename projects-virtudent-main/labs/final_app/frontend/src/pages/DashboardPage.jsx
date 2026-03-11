import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession, listSessions, getStats } from "../api";

import StatsCharts from "../components/StatsCharts.jsx";
import SessionRow from "../components/SessionRow.jsx";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  async function loadData() {
    try {
      setError(null);
      const [s, st] = await Promise.all([listSessions(), getStats()]);
      setSessions(s);
      setStats(st);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onNewChat() {
    try {
      setError(null);
      const res = await createSession();
      navigate(`/chat/${res.session_id}`);
    } catch (e) {
      setError(String(e));
    }
  }

  function openSession(id) {
    navigate(`/chat/${id}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card">
        <div className="cardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="cardTitle">Dashboard</div>
            <div className="small">Statistics and session history</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btnGhost" onClick={loadData}>Refresh</button>
            <button className="btn" onClick={onNewChat}>+ New chat</button>
          </div>
        </div>

        {error && <div className="error"><b>Error:</b> {error}</div>}

        

          <div className="statsGrid">
            <div className="statCard">
              <div className="statMeta">
                <div className="statLabel">Total sessions</div>
              </div>
              <div className="statValueRight">{stats?.total_sessions ?? 0}</div>
            </div>


            <div className="statCard">
              <div className="statMeta">
                <div className="statLabel">Total messages</div>
              </div>
              <div className="statValueRight">{stats?.total_messages ?? 0}</div>
            </div>
        
            <div className="statCard">
              <div className="statMeta">
                <div className="statLabel">Correct</div>
              </div>
              <div className="statValueRight">{stats?.correct ?? 0}</div>
            </div>

          </div>
      </div>

      <StatsCharts sessions={sessions} />

      <div className="card">
        <div className="cardHeader">
          <div className="cardTitle">History</div>
        </div>

        <div className="cardBody" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.length === 0 && <div className="small">No sessions yet</div>}
          {sessions
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((s,index,) => (
            <SessionRow key={s.id} session={s} index={index} onOpen={openSession} />
          ))}
        </div>
      </div>
    </div>
  );
}
