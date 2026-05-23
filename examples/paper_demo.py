from __future__ import annotations

import argparse
import json
import sys
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from stackcert.cass.certificates import CassEngine
from stackcert.cass.scheduler import greedy_measurement_plan
from stackcert.data.importers import infer_guards_from_outputs, load_examples_jsonl, load_guard_outputs_jsonl
from stackcert.data.schemas import WelfareProfile
from stackcert.reporting.json_export import write_certificate_json
from stackcert.reporting.markdown import write_certificate_markdown


def main() -> None:
    parser = argparse.ArgumentParser(description="Run StackCert on an existing CASS JSONL matrix.")
    parser.add_argument("--examples", default="../data/processed/examples_real_main_2000.jsonl")
    parser.add_argument("--outputs", default="../data/outputs/real_main_2000_8agent_outputs.jsonl")
    parser.add_argument("--weights-json", default="../configs/cass_real.json")
    parser.add_argument("--run-id", default="paper_demo")
    parser.add_argument("--lambda-cost", type=float, default=5.0)
    parser.add_argument("--rho-prior", type=float, default=0.6)
    parser.add_argument("--budget-fraction", type=float, default=0.5)
    parser.add_argument("--markdown-out", default="/tmp/stackcert_certificate.md")
    parser.add_argument("--json-out", default="/tmp/stackcert_certificate.json")
    args = parser.parse_args()

    cells, examples = load_examples_jsonl(args.examples, retain_prompt_text=False)
    weights_path = Path(args.weights_json)
    if weights_path.exists():
        config = json.loads(weights_path.read_text(encoding="utf-8"))
        weights = config.get("benchmark_weights", {})
        cells = [replace(cell, weight=float(weights.get(cell.cell_id, cell.weight))) for cell in cells]
    outputs = load_guard_outputs_jsonl(args.outputs, run_id=args.run_id)
    guards = infer_guards_from_outputs(outputs)
    profile = WelfareProfile(
        name=f"lambda_{args.lambda_cost:g}",
        lambda_cost=args.lambda_cost,
        business_rationale="Demo profile for high safety-cost guardrail-stack selection.",
    )

    engine = CassEngine(
        guards=guards,
        cells=cells,
        examples=examples,
        outputs=outputs,
        welfare_profile=profile,
        run_id=args.run_id,
        rho_prior=args.rho_prior,
    )
    scheduled = greedy_measurement_plan(engine, budget_fraction=args.budget_fraction)
    certificate = scheduled.final_engine.build_certificate(measurement_actions=scheduled.actions)

    write_certificate_markdown(certificate, args.markdown_out, engine=scheduled.final_engine)
    write_certificate_json(certificate, args.json_out)

    print(f"status={certificate.status}")
    print(f"recommended={'+'.join(certificate.recommended_architecture.guard_ids)}")
    print(f"certified={'+'.join(certificate.certified_architecture.guard_ids) if certificate.certified_architecture else 'None'}")
    print(f"measurement_actions={len(certificate.measurement_actions)}")
    print(f"markdown={Path(args.markdown_out)}")
    print(f"json={Path(args.json_out)}")


if __name__ == "__main__":
    main()
