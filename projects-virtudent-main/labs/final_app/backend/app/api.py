from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4
import pandas as pd

from app.settings import ODONTO_PATH, NON_ODONTO_PATH, NEURO_PATH
from app.storage.db import (
    init_db, create_session, add_message, get_session, update_slots,
    list_sessions, get_messages, compute_stats, close_session
)

from app.ai.data_loader import load_codbook_from_excel, to_mapping
from app.ai.models import init_case, State, Case
from app.ai.logic import step

app = FastAPI(title="VirtuDent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateSessionResponse(BaseModel):
    session_id: str
    first_message: str

class SendMessageRequest(BaseModel):
    text: str

class SendMessageResponse(BaseModel):
    assistant_text: str
    slot_updates: dict
    revealed_symptoms: list

class DiagnoseRequest(BaseModel):
    diagnosis: str

@app.on_event("startup")
def startup():
    init_db()

    df1 = load_codbook_from_excel(str(ODONTO_PATH), "odontogenic")
    df2 = load_codbook_from_excel(str(NON_ODONTO_PATH), "non_odontogenic")
    df3 = load_codbook_from_excel(str(NEURO_PATH), "neurological_redflags")

    df = pd.concat([df1, df2, df3], ignore_index=True)
    app.state.mapping = to_mapping(df)

@app.post("/api/sessions", response_model=CreateSessionResponse)
def create_new_session():
    case: Case = init_case(app.state.mapping)
    session_id = str(uuid4())

    create_session(session_id, case.disease_truth, case.symptoms_truth)

    state = State()
    out = step(case, state, user_msg="(start)", max_new_clues=1)

    add_message(session_id, "assistant", out["assistant_text"])
    update_slots(session_id, state.slots)

    return CreateSessionResponse(session_id=session_id, first_message=out["assistant_text"])

@app.get("/api/sessions")
def api_list_sessions():
    return list_sessions()

@app.get("/api/sessions/{session_id}")
def api_get_session(session_id: str):
    sess = get_session(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")

    msgs = get_messages(session_id)

    return {
        "session": {
            "id": sess["id"],
            "created_at": sess["created_at"],
            "is_closed": sess["is_closed"],
            "final_status": sess["final_status"],
            "final_feedback": sess["final_feedback"],
            "correct_diagnosis": sess["revealed_answer"], 
        },
        "messages": msgs,
        "slots": sess["slots"],
    }

@app.post("/api/sessions/{session_id}/messages", response_model=SendMessageResponse)
def api_send_message(session_id: str, req: SendMessageRequest):
    sess = get_session(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")

    if sess["is_closed"]:
        raise HTTPException(409, "Session is closed (read-only)")

    case = Case(disease_truth=sess["disease_truth"], symptoms_truth=sess["symptoms_truth"])
    history_msgs = get_messages(session_id)

    state = State(
        history=[f"{m['role'].title()}: {m['text']}" for m in history_msgs],
        slots=sess["slots"],
    )

    add_message(session_id, "user", req.text)

    out = step(case, state, user_msg=req.text, max_new_clues=1)

    add_message(session_id, "assistant", out["assistant_text"])
    update_slots(session_id, state.slots)

    return SendMessageResponse(
        assistant_text=out["assistant_text"],
        slot_updates=out.get("slot_updates", {}),
        revealed_symptoms=out.get("revealed_symptoms", []),
    )

@app.post("/api/sessions/{session_id}/diagnose")
def api_diagnose(session_id: str, req: DiagnoseRequest):
    sess = get_session(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")

    if sess["is_closed"]:
        return {
            "status": sess["final_status"],
            "feedback": sess["final_feedback"],
            "is_closed": True,
            "correct_diagnosis": sess["revealed_answer"],
        }

    case = Case(disease_truth=sess["disease_truth"], symptoms_truth=sess["symptoms_truth"])
    from app.ai.logic import llm_call_groq

    system_prompt = """
You are an expert Dental Professor grading a student's FINAL DIAGNOSIS.

CRITICAL RULE: The "True Hidden Diagnosis" and "True Symptoms List" provided to you are the ABSOLUTE TRUTH.

OUTPUT FORMAT (JSON ONLY):
{
  "status": "CORRECT" | "PARTIALLY_CORRECT" | "WRONG",
  "feedback": "Your direct feedback..."
}
""".strip()

    user_prompt = f"""
True Hidden Diagnosis: "{case.disease_truth}"
True Symptoms List: "{', '.join([s['label'] for s in case.symptoms_truth])}"
Student's Guess: "{req.diagnosis}"
""".strip()

    result = llm_call_groq(system_prompt, "", user_prompt)
    raw_status = (result.get("status") or "WRONG").upper().strip()
    status = raw_status.replace(" ", "_")

    feedback = (result.get("feedback") or "").strip()

    close_session(session_id, status, feedback, case.disease_truth)

    return {
        "status": status,
        "feedback": feedback,
        "is_closed": True,
        "correct_diagnosis": case.disease_truth,
    }

@app.get("/api/stats")
def api_stats():
    return compute_stats()
