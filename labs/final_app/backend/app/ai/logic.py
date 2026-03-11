import os
import json
import re
from groq import Groq
from .models import Case, State


client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def build_patient_system_prompt(case: Case, max_new_clues: int = 1) -> str:
    """
    Build the system prompt for the virtual patient.
    Uses the ground-truth disease and its true symptoms (from case.symptoms_truth).
    """
    symptom_labels = sorted({s["label"] for s in case.symptoms_truth})
    symptoms_text = ", ".join(symptom_labels)

    return f"""
You are a VIRTUAL HUMAN PATIENT talking to a dental medicine student.
Your goal is to help the student practice identifying symptoms, NOT to tell them the diagnosis.

INTERNAL INFO (only for you, never reveal directly):
- True underlying disease (hidden diagnosis): {case.disease_truth}
- Full list of your true symptoms (internal, do not list them all at once): {symptoms_text}

This internal symptom list is your ONLY source of truth.
You MUST NEVER claim (in your words) to have any pain, sensitivity,
discomfort, weird feeling or problem that is NOT in this list.

IMPORTANT:
The student will often use natural, informal language
(e.g. "does it hurt when you drink something cold?", "does it hurt when you chew on that side?",
"is your jaw clicking?", "do you feel pressure under your eyes?").
You should usually understand what symptom they refer to.

====================
BEHAVIOR RULES
====================

1. Never mention the diagnosis or disease names (caries, pulpitis, gingivitis, stroke, etc.)
   and do NOT give medical explanations, causes, treatments, or advice.

2. Speak like a normal person, using informal, simple language
   ("it hurts", "I noticed", "it feels sharp", "it's annoying", "I'm not sure").
   However:
   - You MUST NOT describe any area, action, or situation as painful, sensitive,
     uncomfortable, weird, or bothering you UNLESS it corresponds to a real symptom
     in your internal list.
   - If the student asks about something that is NOT one of your real symptoms
     (for example cold sensitivity when you have no cold/heat-related symptoms),
     you MUST clearly say that it does NOT bother you or that you have NOT noticed
     any problem with that.

3. In your FIRST message of the conversation, you MUST:
   - Start with a short, natural greeting (e.g. “Hi”, “Hello”, “Hi doctor”).
   - Then briefly and vaguely explain what brought you here today.
   - Do NOT mention many specific symptoms yet.
   - Everything you say must still be consistent with your true symptom list.


4. When the student asks about a SPECIFIC SYMPTOM, you MUST:
   - Identify which real symptom the question corresponds to.
   - If the symptom *is in your true internal list*:
         → answer naturally and set slot_updates[symptom_label] = true.
   - If the symptom is *NOT in your true internal list*:
         → answer clearly that this does NOT cause you problems and set
           slot_updates[symptom_label] = false.
   - Your natural-language answer MUST be consistent with slot_updates:
         if you set a symptom to false, your text must NOT describe that symptom
         as painful, sensitive, uncomfortable, or bothering you.
   - You MUST NOT leave slot_updates empty when the question clearly refers to a symptom.
   - DO NOT say “I'm not sure what you mean” for obvious symptom questions involving:
       pain, hurting, sensitivity, cold, hot, chewing, biting, pressure, swelling,
       taste changes, smell, bleeding, clicking, popping, numbness, electric shock pain,
       headache, facial pressure, jaw opening, jaw closing, etc.
     Only ask for clarification when the question is TRULY ambiguous.

5. If the question is very general ("Do you have any other problems?"),
   you may reveal at most {max_new_clues} NEW real symptom(s).

6. Remain consistent: never contradict your previous answers.

7. Do NOT repeat symptoms you've already mentioned,
   and NEVER invent symptoms or discomforts that are NOT in your real symptom list.

8. Each answer must be short and natural (1–3 sentences).

9. slot_updates RULE:
   - Use true if the asked-about symptom is genuinely present in your internal list.
   - Use false if the student clearly asks about a symptom you do NOT have.
   - If the question is vague, you MAY leave slot_updates empty.
   - The KEYS in slot_updates MUST be the exact English symptom labels
     from your internal list when possible (e.g. "Cold sensitivity", "Pain on chewing",
     "Food impaction pain", "Bad taste / halitosis").
   - If the student describes a symptom using different words (e.g. “cold drink pain”),
     map it to the closest real symptom label.

10. Avoid using the exact phrase “I'm not sure what you mean” repeatedly.
    If clarification is needed, vary your wording politely.

11. If the student talks about unrelated topics (life, jokes, exams, etc.),
    politely redirect back to your symptom discussion.

====================
OUTPUT FORMAT
====================

You MUST return ONLY a valid JSON object, EXACTLY in this structure:

{{
  "assistant_text": "the patient's natural-language answer",
  "slot_updates": {{
    "symptom_name_1": true/false,
    "symptom_name_2": true/false
  }}
}}

Do NOT add any text outside the JSON. No explanations, no comments, no extra keys.
""".strip()

def build_patient_context(state: State, case: Case) -> str:
    conversation_summary = state.get_context_for_prompt(limit=8)

    confirmed = [k for k, v in state.slots.items() if v is True]
    denied = [k for k, v in state.slots.items() if v is False]

    all_true_symptoms = [s["label"] for s in case.symptoms_truth]
    unrevealed_true = [s for s in all_true_symptoms if s not in confirmed]

    context = f"""
CURRENT CONVERSATION CONTEXT:
Summary of dialogue:
{conversation_summary}

Symptoms CONFIRMED so far: {', '.join(confirmed) or 'none'}
Symptoms DENIED so far: {', '.join(denied) or 'none'}
True symptoms not yet explicitly mentioned (do NOT reveal them directly to the student):
{', '.join(unrevealed_true) or 'none'}

Instructions:
- Keep your answers coherent with this history.
- Do NOT contradict symptoms you already confirmed or denied.
- Try to be cooperative: if the question clearly refers to one of your symptoms
  (even if phrased informally), answer it instead of saying you don't understand.
- Only ask for clarification when the question is genuinely ambiguous.
""".strip()

    return context


def build_user_prompt(user_msg: str) -> str:
    """
    Wrap the student's message into a clear instruction for the model.
    """
    return f"""
The student asks you: {user_msg}

Follow all the rules from the system and context.

You MUST return ONLY a JSON object with EXACTLY this structure:
{{
  "assistant_text": "your short, realistic answer as the patient",
  "slot_updates": {{
    "some_symptom_key": true/false
  }}
}}
- Use 'slot_updates' to mark specific symptoms that the student is really asking about.
- When they ask about pain or sensitivity with HOT or COLD food or drinks,
  you should normally treat that as a clear question about thermal sensitivity/pain.
- When they ask about chewing, biting, jaw movement, or clicking,
  treat that as a question about function-related symptoms.

Do NOT add any text outside this JSON. No explanations, no comments, no extra keys.
""".strip()


def safe_json_parse(content: str):
    """
    Try to extract and parse a JSON object from the model's response.
    Applies some light cleanup if needed.
    """
    content = content.strip()

    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        raise RuntimeError(f"Could not find any JSON object in the response:\n{content}")
    json_part = match.group(0)

    json_part = json_part.replace("True", "true").replace("False", "false")
    json_part = json_part.replace("’", "'").replace("„", '"').replace("”", '"')
    json_part = re.sub(r",\s*}", "}", json_part)
    json_part = re.sub(r",\s*]", "]", json_part)

    try:
        return json.loads(json_part)
    except Exception as e:
        raise RuntimeError(
            f"Failed to parse JSON even after cleanup:\n{json_part}\nError: {e}"
        )


def llm_call_groq(
    system_prompt: str,
    context_prompt: str,
    user_prompt: str,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
) -> dict:
    """
    Single call to the Groq LLM.
    """
    prompt = (
        f"[SYSTEM]\n{system_prompt}\n\n"
        f"[CONTEXT]\n{context_prompt}\n\n"
        f"[USER]\n{user_prompt}\n"
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=300,
        )
        content = resp.choices[0].message.content.strip()
    except Exception as e:
        raise RuntimeError(f"Groq API error: {e}")

    return safe_json_parse(content)


def step(
    case: Case,
    state: State,
    user_msg: str,
    max_new_clues: int = 1,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
) -> dict:

    system_prompt = build_patient_system_prompt(case, max_new_clues=max_new_clues)
    context_prompt = build_patient_context(state, case)
    user_prompt = build_user_prompt(user_msg)

    out = llm_call_groq(system_prompt, context_prompt, user_prompt, model=model)

    text = out.get("assistant_text", "").strip()
    slot_updates = out.get("slot_updates", {}) or {}

    true_symptom_norms = {
        s["label"].lower().replace(" ", "_") for s in case.symptoms_truth
    }
    filtered_updates = {}
    for k, v in slot_updates.items():
        k_norm = k.lower().replace(" ", "_")
        if v is False and k_norm in true_symptom_norms:
            continue
        filtered_updates[k] = v
    slot_updates = filtered_updates

    addition = f"Student: {user_msg} | Patient: {text}"
    state.history.append(addition)

    if isinstance(slot_updates, dict):
        state.slots.update(slot_updates)

    
    text_lower = text.lower()
    true_labels = [s["label"] for s in case.symptoms_truth]
    label_norm_map = {lbl.lower().replace(" ", "_"): lbl for lbl in true_labels}
    revealed = set()
    for lbl in true_labels:
        if lbl.lower() in text_lower:
            revealed.add(lbl)
    for k, v in state.slots.items():
        if not v: continue
        k_norm = k.lower().replace(" ", "_")
        if k_norm in label_norm_map:
            revealed.add(label_norm_map[k_norm])

    return {
        "assistant_text": text,
        "slot_updates": slot_updates,
        "summary": state.get_context_for_prompt(),
        "revealed_symptoms": list(revealed),
    }

def evaluate_final_diagnosis(case: Case, user_guess: str, model: str = "meta-llama/llama-4-scout-17b-16e-instruct"):
    """
    Evaluates the final diagnosis using the LLM as a Professor.
    """

    print(f"\nEvaluating final diagnosis: '{user_guess}'...\n")

    system_prompt = """
You are an expert Dental Professor grading a student's FINAL DIAGNOSIS.

CRITICAL RULE: The "True Hidden Diagnosis" and "True Symptoms List" provided to you are the ABSOLUTE TRUTH for this specific case.
Even if your external medical knowledge suggests that a certain symptom is "atypical" or "rare" for that disease, YOU MUST ACCEPT IT as a fact for this patient.

INSTRUCTIONS:
1. Accept synonyms (e.g., "Caries" == "Tooth Decay").
2. Address the student DIRECTLY with "You".
3. Determine if the diagnosis is "CORRECT", "PARTIALLY CORRECT", or "WRONG".
4. FEEDBACK STYLE:
   - Be supportive and brief.
   - Do NOT lecture the student on general theory.
   - Do NOT contradict the provided symptom list. Do NOT say things like "However, this symptom is usually not present" or "Note that this is atypical".
   - Simply explain that the diagnosis is correct because it matches the patient's reported symptoms (the ones provided in the list).

OUTPUT FORMAT (JSON ONLY):
{
  "status": "CORRECT" | "PARTIALLY_CORRECT" | "WRONG",
  "feedback": "Your direct feedback..."
}
"""

    user_prompt = f"""
True Hidden Diagnosis: "{case.disease_truth}"
True Symptoms List: "{', '.join([s['label'] for s in case.symptoms_truth])}"
Student's Guess: "{user_guess}"

Evaluate based ONLY on the provided True Symptoms List. Return the JSON.
"""

    try:
        out = llm_call_groq(system_prompt, "", user_prompt, model=model)

        status = out.get("status", "WRONG").upper()
        feedback = out.get("feedback", "No feedback provided.")

        print("="*60)
        print(f"🎓 EVALUATION RESULT: {status}")
        print("="*60)
        print(f"Professor Feedback: {feedback}")
        print("-" * 60)

        if status != "CORRECT":
            print(f"\nThe correct diagnosis was: {case.disease_truth}")
            symptom_list = ", ".join([s['label'] for s in case.symptoms_truth])
            print(f"True symptoms were: {symptom_list}")
        else:
            print("\nCONGRATULATIONS! You identified the correct diagnosis!")

    except Exception as e:
        print(f"Evaluation error: {e}")
        print(f"The correct diagnosis was: {case.disease_truth}")