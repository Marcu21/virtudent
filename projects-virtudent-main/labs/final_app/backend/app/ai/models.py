from dataclasses import dataclass, field
import random
from typing import List, Dict

@dataclass
class Case:
    disease_truth: str
    symptoms_truth: List[dict]

def init_case(mapping: Dict[str, List[dict]]) -> Case:
    """
    Select a random disease and return it with all associated symptoms.
    """
    chosen_disease = random.choice(list(mapping.keys()))
    chosen_symptoms = mapping[chosen_disease]   
    return Case(
        disease_truth=chosen_disease,
        symptoms_truth=chosen_symptoms
    )

@dataclass
class State:
    history: List[str] = field(default_factory=list)
    slots: dict = field(default_factory=dict)

    def get_context_for_prompt(self, limit: int = 8) -> str:
        if not self.history:
            return "The conversation has just started."

        first_turn = self.history[0]

        recent_turns = self.history[-limit:]

        if len(self.history) <= limit:
            return "\n".join(self.history)

        separator = "\n... [middle of conversation omitted] ...\n"
        
        if first_turn in recent_turns:
             return "\n".join(recent_turns)

        return f"{first_turn}{separator}" + "\n".join(recent_turns)