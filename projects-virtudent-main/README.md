# 🦷 Virtual Dental Patient

Acest proiect este o aplicație interactivă bazată pe Inteligență Artificială (LLM),
concepută pentru a ajuta studenții la Medicină Dentară să își exerseze abilitățile
de anamneză și diagnosticare clinică. Aplicația simulează o conversație realistă
cu un pacient virtual care prezintă simptome specifice unei afecțiuni
stomatologice reale.

---

## 👥 Echipa de Proiect
**Nume echipă:** VirtuDent  
**Membrii echipei:**
1. **Marcu Emanuel**
2. **Mitrea Ioan David**
3. **Săsăran Aurelian Noris**

---

## 🚀 Despre Proiect

Sistemul generează aleatoriu cazuri clinice pe baza unei baze de date complexe ce
conține patologii odontogene, non-odontogene și urgențe (*red flags*), relevante
în practica stomatologică.

### 🔄 Fluxul aplicației
1. **Generare caz:** Sistemul selectează o afecțiune și lista completă de simptome
   asociate acesteia din baza de date.
2. **Conversație naturală:** Studentul interacționează cu pacientul virtual, care
   utilizează un limbaj informal, non-medical.
3. **Investigație clinică:** Studentul adresează întrebări pentru a identifica
   simptomele relevante.
4. **Diagnosticare:** Studentul propune un diagnostic final.
5. **Evaluare:** Sistemul compară diagnosticul studentului cu datele reale ale
   cazului și oferă feedback detaliat (corect, parțial corect sau greșit).

---

## 🛠️ Tehnologii și Optimizări

Proiectul integrează concepte moderne de AI Engineering pentru a asigura robustețe,
performanță și coerență conversațională.

- **LLM Backend:**  
  `meta-llama/llama-4-scout-17b-16e-instruct` (via Groq API), utilizat pentru
  latență scăzută și interacțiuni conversaționale în timp real.

- **Prompt Engineering Avansat:**
  - **Patient Persona:** Instrucțiuni stricte (System Prompt) pentru simularea
    unui pacient credibil, care utilizează termeni populari și nu dezvăluie
    diagnosticul sau explicații medicale.
  - **Professor Persona:** Modul de evaluare finală care analizează logic
    diagnosticul propus de student, raportându-l exclusiv la simptomele reale
    ale cazului (*ground truth*).

- **Context Window Optimization (Sliding Window):**
  Pentru a limita dimensiunea promptului, sistemul transmite către LLM:
  - prima replică a conversației (motivul prezentării),
  - ultimele **N** replici relevante (implicit N = 8),
  inserând un separator atunci când conversația devine mai lungă.

- **Ground Truth Enforcement:**
  Sistemul forțează respectarea strictă a simptomelor definite în baza de date,
  prevenind halucinațiile (inventarea de simptome) specifice modelelor de limbaj.

---

## 🧩 Slot Filling – Gestionarea simptomelor

Aplicația utilizează un mecanism de tip *slot filling* pentru a gestiona în mod
structurat informațiile clinice obținute pe parcursul conversației.

Un **slot** reprezintă un simptom despre care studentul a întrebat explicit,
iar pacientul virtual a confirmat sau negat existența acestuia.

### Funcționare:
- Fiecare întrebare relevantă este mapată la un simptom specific.
- Pacientul răspunde în limbaj natural și actualizează simultan structura `slots`:
  - `true` → simptom prezent
  - `false` → simptom absent
- Structura `slots` este utilizată pentru:
  - menținerea consistenței pacientului virtual,
  - prevenirea contradicțiilor între răspunsuri,
  - evaluarea diagnosticului final.

### Exemplu:
```json
{
  "Cold sensitivity": true,
  "Pain on chewing": false,
  "Swelling": true
}
```

Acest mecanism permite separarea clară între:
- **răspunsul conversațional** (text generat de LLM)
- **starea clinică internă** (`slots`), utilizată pentru raționament și evaluare.

---

## 📂 Structura Datelor

Datele clinice sunt organizate în fișiere Excel, asigurând o separare clară între
logica aplicației și conținutul medical:

- `odontogenic_codbook_EN.xlsx` – patologii dentare comune  
- `non_odontogenic_codbook_EN.xlsx` – patologii sinusale, articulare etc.  
- `neurological_redflags_codbook_EN.xlsx` – urgențe și patologii grave care nu
  țin de competența directă a medicului stomatolog  

---

## 🎮 Ghid de Utilizare (Comenzi)

În timpul sesiunii interactive, sunt disponibile următoarele comenzi:

- `/new` – Resetează sesiunea și generează un pacient nou (caz clinic aleatoriu)
- `/diagnose [Nume Boală]` – Comanda finală. Studentul are o singură încercare
  de a propune diagnosticul; sistemul oprește simularea și oferă feedback detaliat
- `/exit` – Închide aplicația

---

## ▶️ Rulare (Setup)

### Dependențe
- Python 3.x
- `pandas`
- `openpyxl`
- `groq`

### Instalare
```bash
pip install pandas openpyxl groq
```

### Cheie Groq API

Aplicația necesită setarea variabilei de mediu `GROQ_API_KEY`.

**Windows (PowerShell):**
```powershell
setx GROQ_API_KEY "your_key_here"
```

**Linux / macOS::**
export GROQ_API_KEY="your_key_here"

După configurare, rulați scriptul principal:
python main.py

---

## ⚠️ Disclaimer

Aplicația este destinată exclusiv scopurilor educaționale.
Nu oferă diagnostic medical real și nu trebuie utilizată în contexte clinice
sau pentru luarea deciziilor medicale.
