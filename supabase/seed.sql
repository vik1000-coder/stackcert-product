insert into public.workspaces (id, name, slug, plan)
values ('00000000-0000-4000-8000-000000000001', 'StackCert Labs Demo', 'demo', 'team')
on conflict (slug) do nothing;

insert into public.projects (
  id,
  workspace_id,
  name,
  slug,
  environment,
  risk_tier,
  data_mode,
  description
)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Acme Copilot',
  'acme-copilot',
  'production',
  'high',
  'redacted_snippets',
  'Seeded guardrail-stack certification project for local development.'
)
on conflict (workspace_id, slug) do nothing;

insert into public.benchmark_suites (
  id,
  workspace_id,
  project_id,
  name,
  version,
  source,
  license,
  status
)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101',
  'CASS Real Main',
  'v2026-05-22',
  'stackcert_seed',
  'mixed benchmark licenses; see source artifacts',
  'validated'
)
on conflict (workspace_id, name, version) do nothing;

insert into public.drift_signals (
  id,
  workspace_id,
  project_id,
  kind,
  severity,
  title,
  description,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'guard_version',
    'warning',
    'Guard version watch',
    'Recertify when guard model, policy prompt, threshold, or endpoint version changes.',
    'open'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'traffic_mix',
    'warning',
    'Traffic mixture watch',
    'Recertify when production traffic diverges from the certified benchmark mixture.',
    'open'
  )
on conflict (id) do nothing;
