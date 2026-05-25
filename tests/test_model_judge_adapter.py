from __future__ import annotations

import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from stackcert.data.schemas import BenchmarkExample
from stackcert.guards.model_judge_adapter import HTTPJSONModelJudgeAdapter, ModelJudgeAdapterError


class _JudgeHandler(BaseHTTPRequestHandler):
    requests: list[dict[str, Any]] = []
    status_code = 200
    response: dict[str, Any] = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "block": False,
                            "risk_score": 0.18,
                            "category": "benign_support",
                            "rationale": "Allowed test case.",
                        }
                    )
                }
            }
        ]
    }

    def do_POST(self) -> None:
        length = int(self.headers.get("content-length") or "0")
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        self.__class__.requests.append({"headers": dict(self.headers), "payload": payload})
        self.send_response(self.__class__.status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(self.__class__.response).encode("utf-8"))

    def log_message(self, *_args: object) -> None:
        return


class ModelJudgeAdapterTest(unittest.TestCase):
    def setUp(self) -> None:
        _JudgeHandler.requests = []
        _JudgeHandler.status_code = 200
        _JudgeHandler.response = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "block": False,
                                "risk_score": 0.18,
                                "category": "benign_support",
                                "rationale": "Allowed test case.",
                            }
                        )
                    }
                }
            ],
            "usage": {"prompt_tokens": 321, "completion_tokens": 44, "total_tokens": 365},
        }
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), _JudgeHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}/v1/chat/completions"

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def test_posts_openai_compatible_judge_request_and_parses_decision(self) -> None:
        adapter = HTTPJSONModelJudgeAdapter(
            guard_id="refund_judge",
            endpoint_url=self.url,
            model="json-judge-test",
            system_prompt="Return JSON.",
            run_id="run_test",
            headers={"Authorization": "Bearer test-secret"},
            threshold=0.5,
            metadata={"contract": "guard_adapter_v1"},
            raise_on_error=True,
        )
        example = BenchmarkExample(
            example_id="ex_1",
            cell_id="benign_support",
            prompt_hash="hash_1",
            prompt_redacted="Explain shipping options.",
            metadata={"side": "benign", "policy_category": "support"},
        )

        output = adapter.score(example)

        self.assertTrue(output.binary_pass)
        self.assertEqual(output.guard_id, "refund_judge")
        self.assertEqual(output.block_probability, 0.18)
        self.assertEqual(output.output_metadata["adapter"], "model_judge")
        self.assertEqual(output.output_metadata["category"], "benign_support")
        self.assertEqual(output.output_metadata["usage_input_tokens"], 321)
        self.assertEqual(output.output_metadata["usage_output_tokens"], 44)
        self.assertNotIn("raw_output", output.output_metadata)
        self.assertEqual(_JudgeHandler.requests[0]["headers"]["Authorization"], "Bearer test-secret")
        self.assertEqual(_JudgeHandler.requests[0]["payload"]["model"], "json-judge-test")
        self.assertEqual(_JudgeHandler.requests[0]["payload"]["response_format"]["type"], "json_object")

    def test_direct_json_response_uses_threshold(self) -> None:
        _JudgeHandler.response = {"risk_score": "0.74", "category": "tool_misuse"}
        adapter = HTTPJSONModelJudgeAdapter(
            guard_id="refund_judge",
            endpoint_url=self.url,
            model="direct-test",
            system_prompt="Return JSON.",
            provider_format="direct_json",
            threshold=0.7,
            raise_on_error=True,
        )
        example = BenchmarkExample("ex_1", "cell_1", "hash_1", prompt_redacted="hello")

        output = adapter.score(example)

        self.assertFalse(output.binary_pass)
        self.assertEqual(output.block_probability, 0.74)

    def test_raises_retryable_error_for_rate_limit_when_configured(self) -> None:
        _JudgeHandler.status_code = 429
        _JudgeHandler.response = {"error": "rate limit"}
        adapter = HTTPJSONModelJudgeAdapter("refund_judge", "json-judge-test", "Return JSON.", self.url, raise_on_error=True)
        example = BenchmarkExample("ex_1", "cell_1", "hash_1", prompt_redacted="hello")

        with self.assertRaises(ModelJudgeAdapterError) as context:
            adapter.score(example)

        self.assertEqual(context.exception.error_class, "rate_limited")


if __name__ == "__main__":
    unittest.main()
