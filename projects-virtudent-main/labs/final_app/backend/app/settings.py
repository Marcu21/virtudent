from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]  
DATA_DIR = BACKEND_DIR / "data"

ODONTO_PATH = DATA_DIR / "odontogenic_codbook_EN.xlsx"
NON_ODONTO_PATH = DATA_DIR / "non_odontogenic_codbook_EN.xlsx"
NEURO_PATH = DATA_DIR / "neurological_redflags_codbook_EN.xlsx"

DB_PATH = BACKEND_DIR / "app.db"
