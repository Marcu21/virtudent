import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage, diagnose, getSession } from "../api";

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);

  const [text, setText] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const [diagResult, setDiagResult] = useState(null);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);

  async function load() {
    try {
      setError(null);
      const res = await getSession(sessionId);
      setMessages(res.messages || []);
      setSession(res.session || null);

      if (res.session?.is_closed) {
        setDiagResult({
          status: res.session.final_status,
          feedback: res.session.final_feedback,
          is_closed: true,
          correct_diagnosis: res.session.correct_diagnosis,
        });
      }
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    load();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isReadOnly = !!session?.is_closed;

  async function onSend() {
    if (isReadOnly) return;
    if (!text.trim()) return;

    const userText = text.trim();
    setText("");
    setMessages((m) => [...m, { role: "user", text: userText }]);

    try {
      const res = await sendMessage(sessionId, userText);
      setMessages((m) => [...m, { role: "assistant", text: res.assistant_text }]);
    } catch (e) {
      setError(String(e));
      await load();
    }
  }

  async function onDiagnose() {
    if (isReadOnly) return;
    if (!diagnosis.trim()) return;

    try {
      setError(null);
      const res = await diagnose(sessionId, diagnosis.trim());

      setDiagResult(res);

      setSession((s) => ({
        ...(s || {}),
        is_closed: true,
        final_status: res.status,
        final_feedback: res.feedback,
        correct_diagnosis: res.correct_diagnosis,
      }));

    } catch (e) {
      setError(String(e));
      await load();
    }
  }

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">Chat session</div>
          <div className="small">
            {isReadOnly ? "Case closed (read-only)" : "You have 1 diagnosis attempt."}
          </div>
        </div>
        <button className="btnGhost" onClick={() => navigate("/")}>
          ← Back to dashboard
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {isReadOnly && (session?.correct_diagnosis || diagResult?.correct_diagnosis) && (
        <div className="cardBody">
          <div className="small">Correct diagnosis</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            {session?.correct_diagnosis || diagResult?.correct_diagnosis}
          </div>
        </div>
      )}

      {diagResult && (
        <div className="cardBody">
          <b>{diagResult.status}</b>
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{diagResult.feedback}</div>
        </div>
      )}

      <div className="chatBox">
        {messages.map((m, i) => (
          <div key={i} className={`bubbleRow ${m.role}`}>
            <div className={`bubble ${m.role}`}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="inputRow">
        <input
          className="input"
          value={text}
          disabled={isReadOnly}
          onChange={(e) => setText(e.target.value)}
          placeholder={isReadOnly ? "This session is read-only." : "Ask the patient..."}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <button className="btn" onClick={onSend} disabled={isReadOnly}>
          Send
        </button>
      </div>

      <div className="inputRow">
        <input
          className="input"
          value={diagnosis}
          disabled={isReadOnly}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Final diagnosis (one attempt)"
          onKeyDown={(e) => e.key === "Enter" && onDiagnose()}
        />
        <button className="btnGhost" onClick={onDiagnose} disabled={isReadOnly}>
          Diagnose
        </button>
      </div>
    </div>
  );
}
