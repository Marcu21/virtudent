import pandas as pd
from collections import defaultdict

def load_codbook_from_excel(path: str, category: str) -> pd.DataFrame:
    """
    Load a codbook (odontogenic / non-odontogenic / neurological red flags)
    and normalize it to a common schema.
    """
    df = pd.read_excel(path)

    cols_to_keep = [c for c in ["diagnostic", "code", "label_en", "description_en", "pattern"] if c in df.columns]
    df = df[cols_to_keep].copy()

    df.rename(
        columns={
            "diagnostic": "disease",
            "label_en": "symptom_label",
            "description_en": "symptom_description",
        },
        inplace=True,
    )

    for col in ["disease", "symptom_label", "symptom_description"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    if "pattern" in df.columns:
        df["pattern"] = df["pattern"].astype(str).str.strip()

    df["category"] = category

    return df

def to_mapping(df):
    """
    Build a dictionary:
    disease → list of symptom dictionaries
    where each symptom has: label, description, pattern, category.
    """
    mapping = defaultdict(list)

    for _, row in df.iterrows():
        symptom = {
            "label": row["symptom_label"],
            "description": row.get("symptom_description", ""),
            "pattern": row.get("pattern", None),
            "category": row["category"],
        }
        mapping[row["disease"]].append(symptom)

    return dict(mapping)