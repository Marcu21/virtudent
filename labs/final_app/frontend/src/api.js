
const API = "http://127.0.0.1:8000/api";


export async function createSession() {
  const r = await fetch(`${API}/sessions`, { method: "POST" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sendMessage(sessionId, text) {
  const r = await fetch(`${API}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function diagnose(sessionId, diagnosis) {
  const r = await fetch(`${API}/sessions/${sessionId}/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diagnosis }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function listSessions() {
  const r = await fetch(`${API}/sessions`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getSession(sessionId) {
  const r = await fetch(`${API}/sessions/${sessionId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getStats() {
  const r = await fetch(`${API}/stats`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

