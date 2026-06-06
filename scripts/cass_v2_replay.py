from __future__ import annotations

import argparse

from stackcert.proof.cass_v2_replay import build_replay_report
from stackcert.proof.frontier import write_json


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Replay CASS v2 candidate search against saved proof outputs.")
    parser.add_argument("--examples", default="demo_data/examples_real_main_2000.jsonl")
    parser.add_argument("--local-outputs", default="../data/outputs/real_main_2000_9agent_with_qwen3_8b_outputs.jsonl")
    parser.add_argument("--grok-outputs", default="artifacts/proof/grok_4_3_outputs.jsonl")
    parser.add_argument("--out", default="web/src/data/cassSearchReplay.json")
    parser.add_argument("--lambda-cost", type=float, default=5.0)
    parser.add_argument("--max-k", type=int, default=4)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    payload = build_replay_report(
        examples_path=args.examples,
        local_outputs_path=args.local_outputs,
        grok_outputs_path=args.grok_outputs,
        lambda_value=args.lambda_cost,
        max_k=args.max_k,
    )
    write_json(args.out, payload)
    for scope in payload["scopes"]:
        old = scope["old_cass_reference"]
        new = scope["cass_recommendation"]
        print(
            f"{scope['id']}: old_cass {old['goal_score']} -> CASS {new['goal_score']} "
            f"({new['rule_label']}, {' + '.join(new['agents'])})"
        )
    print(f"wrote CASS v2 replay fixture: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
