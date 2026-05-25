from __future__ import annotations

from math import ceil
from typing import Any

from stackcert.data.schemas import BenchmarkExample, GuardOutput


DEFAULT_REQUEST_PRICE_USD = 0.0002
DEFAULT_INPUT_PRICE_PER_1M_USD = 0.0
DEFAULT_OUTPUT_PRICE_PER_1M_USD = 0.0
DEFAULT_INPUT_TOKENS = 750
DEFAULT_OUTPUT_TOKENS = 80


def connector_price_card(connector: dict[str, Any]) -> dict[str, Any]:
    config = connector.get("config") or {}
    stored = config.get("price_card") or {}
    request_price = _float_or_default(
        stored.get("request_price_usd", config.get("request_price_usd", connector.get("unit_cost_usd"))),
        DEFAULT_REQUEST_PRICE_USD,
    )
    input_price = _float_or_default(
        stored.get("input_price_per_1m_tokens_usd", config.get("input_price_per_1m_tokens_usd")),
        DEFAULT_INPUT_PRICE_PER_1M_USD,
    )
    output_price = _float_or_default(
        stored.get("output_price_per_1m_tokens_usd", config.get("output_price_per_1m_tokens_usd")),
        DEFAULT_OUTPUT_PRICE_PER_1M_USD,
    )
    return {
        "currency": stored.get("currency") or "USD",
        "billing_unit": stored.get("billing_unit") or "request_plus_tokens",
        "request_price_usd": request_price,
        "input_price_per_1m_tokens_usd": input_price,
        "output_price_per_1m_tokens_usd": output_price,
        "default_input_tokens": int(stored.get("default_input_tokens") or DEFAULT_INPUT_TOKENS),
        "default_output_tokens": int(stored.get("default_output_tokens") or DEFAULT_OUTPUT_TOKENS),
        "source": stored.get("source") or "connector_config",
    }


def estimate_text_tokens(text: str | None) -> int:
    normalized = str(text or "")
    if not normalized.strip():
        return 1
    return max(1, ceil(len(normalized) / 4))


def estimate_example_input_tokens(example: BenchmarkExample) -> int:
    return estimate_text_tokens(example.prompt_text or example.prompt_redacted)


def guard_output_usage_tokens(output: GuardOutput, example: BenchmarkExample | None, price_card: dict[str, Any]) -> tuple[int, int]:
    metadata = getattr(output, "metadata", None) or getattr(output, "output_metadata", None) or {}
    input_tokens = _first_int(
        metadata,
        (
            "usage_input_tokens",
            "input_tokens",
            "prompt_tokens",
            "usage_prompt_tokens",
        ),
    )
    output_tokens = _first_int(
        metadata,
        (
            "usage_output_tokens",
            "output_tokens",
            "completion_tokens",
            "usage_completion_tokens",
        ),
    )
    if input_tokens is None:
        input_tokens = estimate_example_input_tokens(example) if example else int(price_card["default_input_tokens"])
    if output_tokens is None:
        output_tokens = int(price_card["default_output_tokens"])
    return max(0, input_tokens), max(0, output_tokens)


def estimate_connector_cost_usd(
    price_card: dict[str, Any],
    *,
    request_count: int,
    input_tokens: int,
    output_tokens: int,
) -> float:
    cost = (
        max(0, request_count) * float(price_card["request_price_usd"])
        + max(0, input_tokens) * float(price_card["input_price_per_1m_tokens_usd"]) / 1_000_000
        + max(0, output_tokens) * float(price_card["output_price_per_1m_tokens_usd"]) / 1_000_000
    )
    return round(cost, 6)


def price_card_from_payload(payload: Any) -> dict[str, Any]:
    return {
        "currency": "USD",
        "billing_unit": "request_plus_tokens",
        "request_price_usd": float(payload.request_price_usd if payload.request_price_usd is not None else DEFAULT_REQUEST_PRICE_USD),
        "input_price_per_1m_tokens_usd": float(
            payload.input_price_per_1m_tokens_usd
            if payload.input_price_per_1m_tokens_usd is not None
            else DEFAULT_INPUT_PRICE_PER_1M_USD
        ),
        "output_price_per_1m_tokens_usd": float(
            payload.output_price_per_1m_tokens_usd
            if payload.output_price_per_1m_tokens_usd is not None
            else DEFAULT_OUTPUT_PRICE_PER_1M_USD
        ),
        "default_input_tokens": DEFAULT_INPUT_TOKENS,
        "default_output_tokens": DEFAULT_OUTPUT_TOKENS,
        "source": "connector_setup",
    }


def _first_int(metadata: dict[str, Any], keys: tuple[str, ...]) -> int | None:
    for key in keys:
        value = metadata.get(key)
        if value is None:
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return None


def _float_or_default(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
