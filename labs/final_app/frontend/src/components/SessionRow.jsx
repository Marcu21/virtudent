export default function SessionRow({ session,index, onOpen }) {
  const st = session.status ?? "IN_PROGRESS";

  const meta = {
    CORRECT: { label: "CORRECT", badge: "badge correct" },
    PARTIALLY_CORRECT: { label: "PARTIAL", badge: "badge partially_correct" },
    WRONG: { label: "WRONG", badge: "badge wrong" },
    IN_PROGRESS: { label: "IN PROGRESS", badge: "badge in_progress" },
  }[st] ?? { label: st, badge: "badge in_progress" };

  return (
    <div className="sessionRow">
      <button type="button" className="sessionRowMain" onClick={() => onOpen(session.id)}>
        <div className="sessionRowTop">
          <div className="sessionId">
            Case {index + 1}
          </div>
          <span className={meta.badge}>{meta.label}</span>
        </div>

        <div className="sessionRowSub">
          <span>{new Date(session.created_at).toLocaleString()}</span>
          <span className="dotSep">•</span>
          <span>{session.message_count ?? 0} msgs</span>
        </div>
      </button>
    </div>
  );
}
