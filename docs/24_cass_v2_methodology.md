# CASS v2 Methodology And old_cass Audit Layer

Last updated: 2026-06-05

## Naming Decision

`CASS` now refers to StackCert's current method frame: atom-aware,
correlation-aware committee search for scoped release evidence. It covers the
search policy that compares deployable safety-check combinations, penalizes
shared unsafe misses, tracks cost/latency tradeoffs, and keeps external priors
separate from finite-sample evidence.

`old_cass` refers to the legacy K<=2 serial interval certificate. It remains in
the product as the auditable finite-sample evidence layer for the current report
workflow and as the ablation baseline for future search work.

## Current Product Contract

- Backend payloads expose `method_id: cass` and
  `method_version: cass-v2-atom-correlation-search`.
- Certificate/report assumptions expose `evidence_engine: old_cass` and
  `evidence_engine_version: old_cass-k2-serial-interval-v1`.
- Demo and private pilot runs show a method audit trail in overview and release
  report screens.
- MCP theory cards explain CASS v2 and the old_cass evidence layer so release
  gate agents can audit the boundary.
- Closed-source or large-scale benchmark priors are not applied to release
  evidence unless source-backed rows or explicit priors are provided and labeled.

## Claim Boundary

CASS supports a scoped release decision for one app, one example mix, one
candidate safety-check set, one release goal, and one release context. It does
not claim universal deployment safety, broad frontier-model superiority, or
general benchmark transfer.

old_cass can currently provide the tightest auditable interval accounting for
K<=2 serial-veto reports. Richer committee rules, context recipes, weighted
votes, and source-backed external priors should be treated as CASS v2 research
or productization candidates until they pass holdout and source-shift checks.

## UI And Docs Rule

Use `CASS` only for the new committee-search method. Use `old_cass` when
discussing the historical K<=2 certificate result, the old interval engine, or
the finite benchmark ablation.
