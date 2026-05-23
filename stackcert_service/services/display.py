from __future__ import annotations


GUARD_DISPLAY_NAMES: dict[str, str] = {
    "cautious_rules_policy": "CR",
    "gemma3_1b_judge": "Gemma",
    "lexical_guard": "Lex",
    "llama3_2_1b_judge": "L3-1B",
    "llama3_2_3b_judge": "L3-3B",
    "llama_guard3_1b": "LG3",
    "phi3_mini_judge": "Phi3",
    "rules_policy": "Rules",
}


GUARD_TYPES: dict[str, str] = {
    "cautious_rules_policy": "rules",
    "gemma3_1b_judge": "model_judge",
    "lexical_guard": "lexical",
    "llama3_2_1b_judge": "model_judge",
    "llama3_2_3b_judge": "model_judge",
    "llama_guard3_1b": "classifier",
    "phi3_mini_judge": "model_judge",
    "rules_policy": "rules",
}


def guard_label(guard_id: str) -> str:
    return GUARD_DISPLAY_NAMES.get(guard_id, guard_id.replace("_", " "))


def stack_label(guard_ids: tuple[str, ...] | list[str]) -> str:
    return " + ".join(guard_label(guard_id) for guard_id in guard_ids)


def compact_status(status: str) -> str:
    return {
        "certified_winner": "valid",
        "recommended_not_certified": "provisional",
        "no_clear_winner": "needs_measurement",
        "source_fragile": "source_fragile",
        "expired": "expired",
    }.get(status, status)

