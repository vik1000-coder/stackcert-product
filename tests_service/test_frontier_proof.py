from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from stackcert.proof import frontier
from stackcert_service.services import provider_secrets


class FrontierProofTest(unittest.TestCase):
    def test_stratified_sample_is_stable_and_balanced(self) -> None:
        examples = frontier.read_jsonl("demo_data/examples_real_main_2000.jsonl")

        sample_a = frontier.stratified_sample(examples)
        sample_b = frontier.stratified_sample(examples)

        self.assertEqual([row["example_id"] for row in sample_a], [row["example_id"] for row in sample_b])
        self.assertEqual(len(sample_a), 240)
        counts = {cell: 0 for cell in frontier.TARGET_CELLS}
        for row in sample_a:
            counts[frontier.example_cell(row)] += 1
        self.assertEqual(set(counts.values()), {40})

    def test_model_response_parser_accepts_json_content_and_usage(self) -> None:
        parsed = frontier.parse_model_response(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "block": True,
                                    "risk_score": 0.91,
                                    "category": "tool_misuse",
                                    "rationale": "The request asks for an unsafe support action.",
                                }
                            )
                        }
                    }
                ],
                "usage": {"prompt_tokens": 120, "completion_tokens": 20, "total_tokens": 140},
            }
        )

        self.assertTrue(parsed["block"])
        self.assertEqual(parsed["category"], "tool_misuse")
        self.assertEqual(parsed["usage_input_tokens"], 120)
        self.assertEqual(parsed["usage_output_tokens"], 20)

    def test_model_response_parser_rejects_malformed_content(self) -> None:
        with self.assertRaises(ValueError):
            frontier.parse_model_response({"choices": [{"message": {"content": "not json"}}]})

    def test_secret_file_extraction_handles_export_and_bearer_forms(self) -> None:
        token = "xai-test-token"
        self.assertEqual(frontier.extract_secret_value("export XAI_API_KEY" + "=" + token), token)
        self.assertEqual(frontier.authorization_header(token), f"Bearer {token}")
        self.assertEqual(frontier.authorization_header(f"Bearer {token}"), f"Bearer {token}")

    def test_xai_connector_env_secret_gets_bearer_prefix(self) -> None:
        token = "xai-test-token"
        connector = {
            "config": {
                "has_secret": True,
                "auth_header_name": "Authorization",
                "secret_env_var": "XAI_API_KEY",
                "secret_ref": "env://XAI_API_KEY",
                "auth_scheme": "bearer",
            }
        }
        with patch.dict(os.environ, {"XAI_API_KEY": token}):
            headers = provider_secrets.connector_auth_headers("grok_4_3_judge", connector)
        self.assertEqual(headers["Authorization"], f"Bearer {token}")

    def test_analysis_marks_same_decision_lower_cost_when_local_pair_matches_grok(self) -> None:
        examples = _tiny_examples()
        outputs = []
        for example in examples:
            is_adv = frontier.example_side(example) == "A"
            # local_a misses unsafe prompts; local_b catches them. The serial pair matches Grok.
            outputs.append(_output("local_a", example["example_id"], block=False, cost=0))
            outputs.append(_output("local_b", example["example_id"], block=is_adv, cost=0))
            outputs.append(_output(frontier.GROK_AGENT_ID, example["example_id"], block=is_adv, cost=0.00001))

        payload = frontier.analyze_proof(examples, outputs, live_grok_run=True)

        self.assertEqual(payload["summary"]["claim_status"], "supported")
        self.assertTrue(payload["summary"]["same_decision_lower_cost"])
        self.assertEqual(payload["summary"]["always_grok_decision"], "pass")
        self.assertEqual(payload["summary"]["stackcert_local_decision"], "pass")

    def test_analysis_includes_task_specific_slice_summaries(self) -> None:
        examples = _tiny_examples()
        outputs = []
        for example in examples:
            is_adv = frontier.example_side(example) == "A"
            outputs.append(_output("local_a", example["example_id"], block=False, cost=0))
            outputs.append(_output("local_b", example["example_id"], block=is_adv, cost=0))
            outputs.append(_output("local_c", example["example_id"], block=is_adv, cost=0))
            outputs.append(_output(frontier.GROK_AGENT_ID, example["example_id"], block=is_adv, cost=0.00001))

        payload = frontier.analyze_proof(examples, outputs)
        slices = {row["id"]: row for row in payload["task_slices"]}

        self.assertIn("toxic_chat_moderation", slices)
        self.assertIn("strongreject_jailbreaks", slices)
        self.assertEqual(slices["toxic_chat_moderation"]["total_examples"], 4)
        self.assertIn("best_same_decision_local", slices["toxic_chat_moderation"])
        self.assertGreaterEqual(slices["toxic_chat_moderation"]["same_decision_local_count"], 1)
        self.assertEqual(len(slices["toxic_chat_moderation"]["cell_details"]), 2)
        self.assertEqual(len(slices["toxic_chat_moderation"]["example_previews"]), 2)
        preview = slices["toxic_chat_moderation"]["example_previews"][0]
        self.assertIn("input_summary", preview)
        self.assertIn("outputs", preview)
        self.assertNotIn("prompt_text", json.dumps(preview))
        self.assertNotIn("user asks", json.dumps(preview))

    def test_analysis_is_honest_when_local_pair_does_not_match_grok_decision(self) -> None:
        examples = _tiny_examples()
        outputs = []
        for example in examples:
            is_adv = frontier.example_side(example) == "A"
            # Grok catches unsafe prompts, while both local checks miss every unsafe prompt.
            outputs.append(_output("local_a", example["example_id"], block=False, cost=0))
            outputs.append(_output("local_b", example["example_id"], block=False, cost=0))
            outputs.append(_output(frontier.GROK_AGENT_ID, example["example_id"], block=is_adv, cost=0.00001))

        payload = frontier.analyze_proof(examples, outputs)

        self.assertEqual(payload["summary"]["claim_status"], "not_supported")
        self.assertFalse(payload["summary"]["same_decision_lower_cost"])
        self.assertEqual(payload["summary"]["always_grok_decision"], "pass")
        self.assertEqual(payload["summary"]["stackcert_local_decision"], "block")

    def test_cli_writes_aggregate_without_prompt_text(self) -> None:
        examples = _tiny_examples(per_cell=1)
        outputs = []
        for example in examples:
            is_adv = frontier.example_side(example) == "A"
            outputs.append(_output("local_a", example["example_id"], block=False, cost=0))
            outputs.append(_output("local_b", example["example_id"], block=is_adv, cost=0))
            outputs.append(_output(frontier.GROK_AGENT_ID, example["example_id"], block=is_adv, cost=0.00001))

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "proof.json"
            payload = frontier.analyze_proof(examples, outputs)
            frontier.write_json(out, payload)
            content = out.read_text(encoding="utf-8")

        self.assertIn("Support-copilot prompt safety classification", content)
        self.assertNotIn("prompt_text", content)
        self.assertNotIn("user asks", content)


def _tiny_examples(per_cell: int = 2) -> list[dict[str, str]]:
    rows = []
    for cell in frontier.TARGET_CELLS:
        for index in range(per_cell):
            rows.append(
                {
                    "example_id": f"{cell.replace('/', '_')}_{index}",
                    "benchmark_cell": cell,
                    "prompt_hash": f"hash_{cell}_{index}",
                    "prompt_text": "user asks a support question",
                }
            )
    return rows


def _output(agent_id: str, example_id: str, *, block: bool, cost: float) -> dict[str, object]:
    return {
        "agent_id": agent_id,
        "example_id": example_id,
        "block_decision": 1 if block else 0,
        "block_score_raw": 0.9 if block else 0.1,
        "runtime_sec": 0.01,
        "estimated_cost_usd": cost,
        "parse_failed": False,
        "error": None,
    }


if __name__ == "__main__":
    unittest.main()
