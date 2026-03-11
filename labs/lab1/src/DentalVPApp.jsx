// src/DentalVPApp.jsx
import { useEffect, useRef, useState } from "react";

/* ========== DATE (cazuri + hint-uri) ========== */
const CASES = [
    {
        id: "C001",
        title: "Disconfort molar inferior dreapta",
        chief_complaint: "Mă cam supără o măsea jos, în dreapta, de câteva zile.",
        gold: { category: "pulpita_ireversibila", tooth: "46", label: "pulpită ireversibilă 46" },
        answers: [
            { topic: "cold", q: /rece|frig|apa rece/i, a: "La rece parcă înțeapă mai tare." },
            { topic: "hot", q: /cald|ceai|supa|cafea fierbinte/i, a: "La cald rămâne un pic după." },
            { topic: "night", q: /noapte|noapta|trezeste/i, a: "Da, m-a mai trezit noaptea." },
            { topic: "percussion", q: /lovire|bate|percu|ating/i, a: "Dacă bat ușor, nu e groaznic." },
            { topic: "swelling", q: /umflat|edem|obraz/i, a: "Nu pare umflat." },
            { topic: "duration", q: /cand a inceput|de cand|zile|saptamani/i, a: "De vreo 3–4 zile." },
            { topic: "location", q: /unde|in ce parte|sus|jos|dreapta|stanga/i, a: "Jos, pe partea dreaptă." },
        ],
        hints: [
            "Întreabă dacă durerea la rece dispare imediat sau persistă după ce îndepărtezi stimulul.",
            "Clarifică dacă apare durere nocturnă (îl trezește din somn).",
            "Întreabă de răspunsul la cald (durere care rămâne câteva minute).",
            "Combinația „rece + cald + noaptea” indică afectare pulpară avansată; localizează dintele (46).",
        ],
    },
    {
        id: "C002",
        title: "Disconfort maxilar stânga",
        chief_complaint: "Simt o jenă la o măsea sus, în stânga. Uneori deranjează la mușcat.",
        gold: { category: "parodontita_apicala_acuta", tooth: "26", label: "parodontită apicală acută 26" },
        answers: [
            { topic: "cold", q: /rece|frig/i, a: "La rece nu prea observ ceva." },
            { topic: "hot", q: /cald|ceai|supa/i, a: "Nici la cald nu e cine știe ce." },
            { topic: "percussion", q: /lovire|bate|percu|ating|muscat/i, a: "La bătut sau mușcat deranjează." },
            { topic: "swelling", q: /umflat|edem|obraz/i, a: "E ușor umflat pe acolo." },
            { topic: "fever", q: /febra|temperatura/i, a: "Nu cred că am febră." },
            { topic: "duration", q: /de cand|cand a inceput|zile|saptamani/i, a: "Cred că de vreo săptămână." },
            { topic: "location", q: /unde|partea|sus|jos|dreapta|stanga/i, a: "Sus, stânga." },
        ],
        hints: [
            "Întreabă specific de durerea la percuție sau la mușcat.",
            "Observă dacă există umflare locală a obrazului sau gingiei.",
            "Răspuns minim la rece/cald dar percuție pozitivă + umflare sugerează problemă apicală.",
            "Focalizează pe dintele 26 (supraocluzie/percuție, debut recent).",
        ],
    },
    {
        id: "C003",
        title: "Înțepătură scurtă anterior molar superior",
        chief_complaint: "Uneori simt o înțepătură scurtă la un dinte sus, înaintea măselelor.",
        gold: { category: "carie_dentina", tooth: "24", label: "carie dentină 24" },
        answers: [
            { topic: "cold", q: /rece|frig/i, a: "La rece pișcă scurt și trece." },
            { topic: "hot", q: /cald|ceai|supa/i, a: "La cald nu prea." },
            { topic: "night", q: /noapte|noapta/i, a: "Nu mă deranjează noaptea." },
            { topic: "percussion", q: /lovire|bate|percu|ating/i, a: "La bătut e ok." },
            { topic: "swelling", q: /umflat|edem|obraz/i, a: "Nu e umflat." },
            { topic: "location", q: /unde|partea|sus|jos|dreapta|stanga/i, a: "Sus, înaintea măselelor." },
        ],
        hints: [
            "Clarifică dacă durerea la rece este scurtă și dispare imediat.",
            "Verifică absența durerii nocturne și a sensibilității la percuție.",
            "Imaginează-ți o leziune în dentină: simptome limitate la stimuli reci, fără semne apicale.",
            "Localizează pe 24 (în zona premolară superioară).",
        ],
    },
];

const DIAGNOSIS_TAXONOMY = {
    pulpita_ireversibila: ["pulpita ireversibila", "pulpita irev", "pulpita"],
    parodontita_apicala_acuta: [
        "parodontita apicala acuta",
        "apicala acuta",
        "parodontita apicala",
        "abces apical acut",
    ],
    carie_dentina: ["carie dentina", "carie dentara", "carie", "leziune carioasa"],
};

/* ========== UTIL ========== */
const norm = (s) =>
    (s || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();

const mapDiagnosisToCategory = (text) => {
    const t = norm(text);
    for (const [cat, syn] of Object.entries(DIAGNOSIS_TAXONOMY)) {
        if (syn.some((p) => t.includes(norm(p)))) return cat;
    }
    return null;
};

const extractTooth = (text) => {
    const m = norm(text).match(/\b([1-4][1-8])\b/); // FDI simplu
    return m ? m[1] : null;
};

const gradeDiagnosis = (userText, gold) => {
    const cat = mapDiagnosisToCategory(userText);
    const tooth = extractTooth(userText);
    if (cat === gold.category) {
        if (!gold.tooth || tooth === gold.tooth)
            return { verdict: "Corect", detail: "Categoria și dintele sunt corecte." };
        return {
            verdict: "Parțial",
            detail: `Categoria corectă (${cat}), dar dintele diferit/lipsă (așteptat ${gold.tooth}).`,
        };
    }
    return {
        verdict: "Greșit",
        detail: "Continuă anamneza: stimuli (rece/cald), noaptea, percuție, umflare.",
    };
};

/* ========== PROPUNERI DIAGNOSTIC (4 variante) ========== */
function makeSuggestions(currentCase) {
    const correct = currentCase.gold.label;
    const categories = Object.keys(DIAGNOSIS_TAXONOMY).filter(
        (c) => c !== currentCase.gold.category
    );
    const randomTooth = () => {
        const t = currentCase.gold.tooth;
        if (!t) return "36";
        const first = t[0];
        const pool = ["4", "5", "6", "7", "8"].filter((x) => x !== t[1]);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return `${first}${pick}`;
    };
    const labels = [
        correct,
        `${(categories[0] || "carie_dentina").replaceAll("_", " ")} ${randomTooth()}`,
        `${(categories[1] || "pulpita_ireversibila").replaceAll("_", " ")} ${randomTooth()}`,
        `${(categories[2] || "parodontita_apicala_acuta").replaceAll("_", " ")} ${randomTooth()}`,
    ];
    for (let i = labels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [labels[i], labels[j]] = [labels[j], labels[i]];
    }
    return labels;
}

/* ========== COMPONENTE MICI ========== */
function Message({ who, text }) {
    const me = who === "student";
    return (
        <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow ${
                    me ? "bg-sky-600 text-white" : "bg-white border border-slate-200"
                }`}
            >
                {text}
            </div>
        </div>
    );
}

/* ========== APP ========== */
export default function DentalVPApp() {
    const [caseData, setCaseData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const [askedTopics, setAskedTopics] = useState([]);

    // hint-uri
    const [hintIndex, setHintIndex] = useState(0);
    const [revealedHints, setRevealedHints] = useState([]);

    // diagnostic
    const [diagnosis, setDiagnosis] = useState("");
    const [grading, setGrading] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState("");

    // istoric
    const [history, setHistory] = useState(() => {
        try {
            const raw = localStorage.getItem("vp_history_v1");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const chatRef = useRef(null);

    useEffect(() => {
        localStorage.setItem("vp_history_v1", JSON.stringify(history));
    }, [history]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const startCase = () => {
        const c = CASES[Math.floor(Math.random() * CASES.length)];
        setCaseData(c);
        setMessages([
            { who: "system", text: `Caz selectat: ${c.title}` },
            { who: "patient", text: c.chief_complaint },
        ]);
        setDiagnosis("");
        setGrading(null);
        setInput("");
        setAskedTopics([]);
        // reset hint-uri
        setHintIndex(0);
        setRevealedHints([]);
        // reset propuneri
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedSuggestion("");
    };

    const patientReply = (userText) => {
        if (!caseData) return "Te rog începe un caz.";
        const hit = caseData.answers.find((a) => a.q.test(userText));
        if (hit) return hit.a;
        if (/de ce|ce sa fac|care e problema|nu stiu/i.test(userText))
            return "Poți întreba mai specific ca să înțeleg mai bine.";
        return "Poți detalia întrebarea?";
    };

    const detectTopicsInText = (text) => {
        const covered = new Set(askedTopics);
        for (const a of caseData?.answers || []) {
            if (a.q.test(text)) covered.add(a.topic);
        }
        return Array.from(covered);
    };

    const send = () => {
        const text = input.trim();
        if (!text) return;
        setInput("");
        const reply = patientReply(text);
        setMessages((m) => [...m, { who: "student", text }, { who: "patient", text: reply }]);
        setAskedTopics(detectTopicsInText(text));
    };

    const giveOneHint = () => {
        if (!caseData) return;
        const idx = hintIndex;
        const hint = caseData.hints?.[idx];
        if (!hint) {
            return;
        }
        setHintIndex(idx + 1);
        setRevealedHints((h) => [...h, hint]);
    };

    const openDiagSuggestions = () => {
        if (!caseData) return;
        const s = makeSuggestions(caseData);
        setSuggestions(s);
        setShowSuggestions(true);
        setSelectedSuggestion("");
    };

    const submitDiagnosis = () => {
        if (!caseData) return;
        const userDiag = selectedSuggestion || diagnosis.trim();
        if (!userDiag) return;

        const g = gradeDiagnosis(userDiag, caseData.gold);
        setGrading(g);
        setMessages((m) => [
            ...m,
            { who: "student", text: `Propun diagnostic: ${userDiag}` },
            { who: "patient", text: `Verdict: ${g.verdict}. ${g.detail}` },
        ]);

        const transcript = messages
            .filter((x) => x.who !== "system")
            .concat([
                { who: "student", text: `Propun diagnostic: ${userDiag}` },
                { who: "patient", text: `Verdict: ${g.verdict}. ${g.detail}` },
            ]);

        setHistory((H) => [
            {
                id: `H_${Date.now()}`,
                timestamp: new Date().toISOString(),
                caseId: caseData.id,
                title: caseData.title,
                gold: caseData.gold,
                userDiagnosis: userDiag,
                verdict: g.verdict,
                transcript,
                askedTopics,
                hints: revealedHints,
            },
            ...H,
        ]);
    };


    const hintsLeft = caseData ? (caseData.hints?.length || 0) - revealedHints.length : 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl p-4 md:p-6">
                <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Pacient virtual</h1>
                        <p className="text-sm text-slate-500">
                            Pune întrebări specifice, folosește hint-uri doar când ai nevoie, apoi propune un diagnostic.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {caseData && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Case ID: {caseData.id}
              </span>
                        )}
                        <button
                            onClick={startCase}
                            className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-sky-700"
                        >
                            {caseData ? "Caz nou" : "Începe caz"}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {/* Chat */}
                    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Conversație</h3>
                                <p className="text-xs text-slate-500">
                                    {caseData ? "Pune întrebări scurte și clarifică simptomele." : "Apasă „Începe caz”"}
                                </p>
                            </div>
                        </div>

                        <div ref={chatRef} className="h-[420px] overflow-y-auto bg-slate-50 p-4">
                            {messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                    Niciun mesaj încă.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {messages
                                        .filter((m) => m.who !== "system")
                                        .map((m, i) => (
                                            <Message key={i} who={m.who} text={m.text} />
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 p-4">
                            <input
                                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100"
                                placeholder={caseData ? "Scrie o întrebare pentru pacient…" : "Începe un caz mai întâi"}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && send()}
                                disabled={!caseData}
                            />
                            <button
                                onClick={send}
                                disabled={!caseData || !input.trim()}
                                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-900 disabled:opacity-50"
                            >
                                Trimite
                            </button>
                        </div>
                    </div>

                    {/* Diagnostic + Hint-uri */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Header card */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                            <h3 className="text-sm font-semibold text-slate-800">Analiză clinică</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openDiagSuggestions}
                                    disabled={!caseData}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Propune 4 variante
                                </button>
                                <button
                                    onClick={giveOneHint}
                                    disabled={!caseData || hintsLeft <= 0}
                                    className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-amber-600 disabled:opacity-50"
                                    title={hintsLeft > 0 ? `Hint-uri rămase: ${hintsLeft}` : "Ai epuizat hint-urile"}
                                >
                                    Hint
                                </button>
                            </div>
                        </div>

                        {/* SECTIUNEA 1: HINT-URI (sus) */}
                        <section className="px-5 pt-5 pb-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                                <div className="mb-1 flex items-center justify-between">
                                    <div className="font-semibold text-amber-800">Hint-uri (întrebări utile)</div>
                                    <div className="text-xs text-amber-700">
                                        {revealedHints.length}/{caseData?.hints?.length ?? 0}
                                    </div>
                                </div>

                                {revealedHints.length === 0 ? (
                                    <div className="text-amber-800">
                                        Apasă „Hint” pentru a primi câte o întrebare de pus pacientului.
                                    </div>
                                ) : (
                                    <ul className="list-disc pl-5 space-y-1 text-amber-900">
                                        {revealedHints.map((h, i) => (
                                            <li key={i}>{h}</li>
                                        ))}
                                    </ul>
                                )}

                                {hintsLeft <= 0 && caseData && (
                                    <div className="mt-2 text-xs text-amber-700">Ai epuizat hint-urile.</div>
                                )}
                            </div>
                        </section>

                        {/* separator vizual intre sectiuni */}
                        <div className="border-t border-slate-100" />

                        {/* SECTIUNEA 2: DIAGNOSTIC (jos) */}
                        <section className="p-5 space-y-4">
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-slate-600">Alege una din variante:</div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {suggestions.map((opt) => (
                                            <label
                                                key={opt}
                                                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm ${
                                                    selectedSuggestion === opt
                                                        ? "border-sky-400 bg-sky-50"
                                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="diag"
                                                    value={opt}
                                                    checked={selectedSuggestion === opt}
                                                    onChange={() => setSelectedSuggestion(opt)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setShowSuggestions(false)}
                                        className="text-xs text-slate-500 underline"
                                    >
                                        ascunde variantele
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    placeholder="Ex.: pulpită ireversibilă 46"
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    disabled={!!selectedSuggestion && showSuggestions}
                                />
                                <button
                                    onClick={submitDiagnosis}
                                    disabled={!caseData || (!diagnosis.trim() && !selectedSuggestion)}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Evaluează
                                </button>
                            </div>

                            {grading && caseData && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                                    <div className="font-semibold text-slate-800">
                                        Verdict:{" "}
                                        <span className="inline-block rounded-md bg-white px-2 py-0.5 border border-emerald-200 shadow-sm">
            {grading.verdict}
          </span>
                                    </div>
                                    <div className="mt-1 text-slate-700">{grading.detail}</div>
                                    <div className="mt-2 text-xs text-slate-500">
                                        Așteptat: {caseData.gold.category} · dinte {caseData.gold.tooth}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                </div>

                {/* Istoric */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Istoric cazuri</h3>
                        <button
                            onClick={() => setHistory([])}
                            disabled={history.length === 0}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-50"
                        >
                            Golește istoric
                        </button>
                    </div>
                    {history.length === 0 ? (
                        <div className="p-5 text-sm text-slate-500">Încă nu ai cazuri în istoric.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {history.map((h) => (
                                <li key={h.id} className="p-4">
                                    <details>
                                        <summary className="cursor-pointer list-none">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm">
                                                    <div className="font-medium text-slate-800">{h.title}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {new Date(h.timestamp).toLocaleString()} · verdict:{" "}
                                                        <span className="font-medium">{h.verdict}</span>
                                                    </div>
                                                </div>
                                                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                                    {h.userDiagnosis}
                                                </div>
                                            </div>
                                        </summary>
                                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                                                    Transcript
                                                </div>
                                                <div className="space-y-2">
                                                    {h.transcript.map((t, i) => (
                                                        <div key={i} className={`text-sm ${t.who === "student" ? "text-sky-700" : "text-slate-800"}`}>
                                                            <span className="font-semibold">{t.who === "student" ? "Student:" : "Pacient:"}</span>{" "}
                                                            {t.text}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Hint-uri folosite</div>
                                                {h.hints?.length ? (
                                                    <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                                                        {h.hints.map((x, i) => (
                                                            <li key={i}>{x}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="text-sm text-slate-500">—</div>
                                                )}
                                            </div>
                                        </div>
                                    </details>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <footer className="mt-6 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} VirtuDent
                </footer>
            </div>
        </div>
    );
}
