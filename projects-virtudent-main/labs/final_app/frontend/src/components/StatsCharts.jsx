import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

export default function StatsCharts({ sessions }) {
  const counts = { CORRECT: 0, PARTIALLY_CORRECT: 0, WRONG: 0, IN_PROGRESS: 0 };

  for (const s of sessions) {
    const st = s.status ?? "IN_PROGRESS";
    counts[st] = (counts[st] ?? 0) + 1;
  }

  const pieData = [
    { name: "Correct", value: counts.CORRECT },
    { name: "Partial", value: counts.PARTIALLY_CORRECT },
    { name: "Wrong", value: counts.WRONG },
    { name: "In progress", value: counts.IN_PROGRESS },
  ];

  const msgBars = sessions.slice(0, 10).map((s, idx) => ({
    name: `#${idx + 1}`,
    messages: s.message_count ?? 0,
  }));

  const pieColors = ["#16a34a", "#d97706", "#dc2626", "#64748b"];
  const COLORS = {
    primary: "#2563eb",
    grid: "#e2e8f0",
    text: "#334155",
  };
  return (
    <div className="grid2">
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Outcomes</div>
            <div className="small">Distribution by final status</div>
          </div>
        </div>
        <div className="cardBody">
          <div className="chartBox">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Messages</div>
            <div className="small">Last 10 sessions</div>
          </div>
        </div>
        <div className="cardBody">
          <div className="chartBox">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={msgBars} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="4 4" />
                <XAxis dataKey="name" tick={{ fill: COLORS.text }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: COLORS.text }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="messages" radius={[10, 10, 0, 0]} fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
