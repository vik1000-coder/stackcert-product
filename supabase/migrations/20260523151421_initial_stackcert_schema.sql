create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create type public.workspace_role as enum (
  'owner',
  'admin',
  'platform',
  'security',
  'risk_reviewer',
  'viewer'
);

create type public.stackcert_job_status as enum (
  'draft',
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled'
);

create type public.certificate_status as enum (
  'draft',
  'valid',
  'provisional',
  'needs_measurement',
  'expired',
  'revoked',
  'failed'
);

create type public.data_handling_mode as enum (
  'raw_allowed',
  'redacted_snippets',
  'hashes_only',
  'customer_hosted'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  environment text not null default 'production',
  risk_tier text not null default 'standard',
  data_mode public.data_handling_mode not null default 'redacted_snippets',
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table public.benchmark_suites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  version text not null,
  source text not null default 'custom',
  license text,
  status text not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name, version)
);

create table public.benchmark_cells (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  suite_id uuid not null references public.benchmark_suites(id) on delete cascade,
  cell_key text not null,
  side text not null check (side in ('adversarial', 'benign')),
  source text not null,
  policy_category text,
  severity text,
  weight numeric not null default 1.0,
  description text,
  created_at timestamptz not null default now(),
  unique (suite_id, cell_key)
);

create table public.examples (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  suite_id uuid not null references public.benchmark_suites(id) on delete cascade,
  cell_id uuid not null references public.benchmark_cells(id) on delete cascade,
  external_id text not null,
  prompt_hash text not null,
  prompt_redacted text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (suite_id, external_id)
);

create table public.custom_behaviors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  external_behavior_id text not null,
  name text not null,
  description text,
  side text not null check (side in ('adversarial', 'benign')),
  policy_category text,
  severity text,
  prompt_hash text not null,
  prompt_redacted text,
  expected_safe_behavior text,
  unsafe_behavior text,
  status text not null default 'draft',
  version text not null default 'draft-v1',
  validation jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, external_behavior_id),
  unique (project_id, prompt_hash)
);

create table public.guard_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  guard_key text not null,
  display_name text not null,
  guard_type text not null,
  vendor text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, guard_key)
);

create table public.guard_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  guard_id uuid not null references public.guard_definitions(id) on delete cascade,
  version text not null,
  threshold numeric,
  adapter_type text not null default 'uploaded_outputs',
  config jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (guard_id, version)
);

create table public.candidate_stacks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  aggregation text not null default 'serial',
  max_k integer not null default 2,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_stack_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stack_id uuid not null references public.candidate_stacks(id) on delete cascade,
  guard_version_id uuid not null references public.guard_versions(id) on delete restrict,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (stack_id, position),
  unique (stack_id, guard_version_id)
);

create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  benchmark_suite_id uuid references public.benchmark_suites(id) on delete set null,
  external_run_id text,
  status public.stackcert_job_status not null default 'draft',
  lambda_cost numeric not null default 5.0,
  rho_prior numeric not null default 0.6,
  k integer not null default 2,
  summary jsonb not null default '{}',
  created_by uuid references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guard_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  example_id uuid references public.examples(id) on delete set null,
  guard_version_id uuid references public.guard_versions(id) on delete set null,
  external_example_id text not null,
  guard_key text not null,
  pass_probability numeric not null,
  block_probability numeric not null,
  binary_pass boolean not null,
  error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.measurement_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  action_key text not null,
  guard_keys text[] not null,
  cell_key text not null,
  expected_radius_reduction numeric not null default 0,
  cost_estimate_usd numeric not null default 0,
  eta_minutes integer,
  status text not null default 'recommended',
  created_at timestamptz not null default now(),
  unique (run_id, action_key)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid not null references public.evaluation_runs(id) on delete restrict,
  certificate_key text not null,
  status public.certificate_status not null,
  selected_stack_label text not null,
  scope text not null,
  issued_by uuid references auth.users(id),
  issued_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  artifact_hash text,
  summary jsonb not null default '{}',
  limitations jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (workspace_id, certificate_key)
);

create table public.certificate_signoffs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  signer_user_id uuid references auth.users(id),
  signer_role public.workspace_role not null,
  decision text not null check (decision in ('approved', 'rejected', 'requested_changes')),
  comment text,
  created_at timestamptz not null default now()
);

create table public.drift_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  certificate_id uuid references public.certificates(id) on delete set null,
  kind text not null,
  severity text not null default 'warning',
  title text not null,
  description text,
  status text not null default 'open',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  run_id uuid references public.evaluation_runs(id) on delete cascade,
  external_job_id text not null,
  external_run_id text,
  kind text not null,
  status public.stackcert_job_status not null default 'queued',
  idempotency_key text,
  input jsonb not null default '{}',
  result jsonb,
  error text,
  attempts integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (workspace_id, external_job_id),
  unique (workspace_id, idempotency_key)
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  run_id uuid references public.evaluation_runs(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  provider text,
  model text,
  operation text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  request_count integer not null default 0,
  duration_ms integer,
  estimated_cost_usd numeric not null default 0,
  actual_cost_usd numeric,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.artifact_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  run_id uuid references public.evaluation_runs(id) on delete cascade,
  certificate_id uuid references public.certificates(id) on delete set null,
  bucket text not null,
  object_path text not null,
  artifact_type text not null,
  byte_size bigint,
  content_type text,
  sha256 text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create index on public.workspace_memberships (user_id, workspace_id);
create index on public.projects (workspace_id);
create index on public.benchmark_suites (workspace_id, project_id);
create index on public.examples (workspace_id, suite_id);
create index on public.custom_behaviors (workspace_id, project_id, status);
create index on public.guard_outputs (workspace_id, run_id);
create index on public.measurement_recommendations (workspace_id, run_id);
create index on public.certificates (workspace_id, project_id, status);
create index on public.drift_signals (workspace_id, project_id, status);
create index on public.jobs (workspace_id, project_id, status, created_at);
create index on public.jobs (workspace_id, external_run_id);
create index on public.usage_events (workspace_id, run_id, created_at);
create index on public.audit_events (workspace_id, created_at);

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger set_workspaces_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();
create trigger set_workspace_memberships_updated_at before update on public.workspace_memberships
for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger set_benchmark_suites_updated_at before update on public.benchmark_suites
for each row execute function public.set_updated_at();
create trigger set_custom_behaviors_updated_at before update on public.custom_behaviors
for each row execute function public.set_updated_at();
create trigger set_guard_definitions_updated_at before update on public.guard_definitions
for each row execute function public.set_updated_at();
create trigger set_candidate_stacks_updated_at before update on public.candidate_stacks
for each row execute function public.set_updated_at();
create trigger set_evaluation_runs_updated_at before update on public.evaluation_runs
for each row execute function public.set_updated_at();
create trigger set_jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function private.has_workspace_role(target_workspace_id uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = any(allowed_roles)
  );
$$;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.projects enable row level security;
alter table public.benchmark_suites enable row level security;
alter table public.benchmark_cells enable row level security;
alter table public.examples enable row level security;
alter table public.custom_behaviors enable row level security;
alter table public.guard_definitions enable row level security;
alter table public.guard_versions enable row level security;
alter table public.candidate_stacks enable row level security;
alter table public.candidate_stack_members enable row level security;
alter table public.evaluation_runs enable row level security;
alter table public.guard_outputs enable row level security;
alter table public.measurement_recommendations enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_signoffs enable row level security;
alter table public.drift_signals enable row level security;
alter table public.jobs enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.artifact_objects enable row level security;

create policy "profiles can read own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "profiles can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "members can read workspaces"
on public.workspaces for select to authenticated
using (private.is_workspace_member(id));

create policy "owners and admins can update workspaces"
on public.workspaces for update to authenticated
using (private.has_workspace_role(id, array['owner','admin']::public.workspace_role[]))
with check (private.has_workspace_role(id, array['owner','admin']::public.workspace_role[]));

create policy "members can read memberships"
on public.workspace_memberships for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "owners and admins can insert memberships"
on public.workspace_memberships for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "owners and admins can update memberships"
on public.workspace_memberships for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "owners and admins can delete memberships"
on public.workspace_memberships for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members can read projects"
on public.projects for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert projects"
on public.projects for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update projects"
on public.projects for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete projects"
on public.projects for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read benchmark suites"
on public.benchmark_suites for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert benchmark suites"
on public.benchmark_suites for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update benchmark suites"
on public.benchmark_suites for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete benchmark suites"
on public.benchmark_suites for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read benchmark cells"
on public.benchmark_cells for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert benchmark cells"
on public.benchmark_cells for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update benchmark cells"
on public.benchmark_cells for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete benchmark cells"
on public.benchmark_cells for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read examples"
on public.examples for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert examples"
on public.examples for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update examples"
on public.examples for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete examples"
on public.examples for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read custom behaviors"
on public.custom_behaviors for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert custom behaviors"
on public.custom_behaviors for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update custom behaviors"
on public.custom_behaviors for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete custom behaviors"
on public.custom_behaviors for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read guard definitions"
on public.guard_definitions for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert guard definitions"
on public.guard_definitions for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "platform roles can update guard definitions"
on public.guard_definitions for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "platform roles can delete guard definitions"
on public.guard_definitions for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "members can read guard versions"
on public.guard_versions for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert guard versions"
on public.guard_versions for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "platform roles can update guard versions"
on public.guard_versions for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "platform roles can delete guard versions"
on public.guard_versions for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "members can read candidate stacks"
on public.candidate_stacks for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert candidate stacks"
on public.candidate_stacks for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update candidate stacks"
on public.candidate_stacks for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete candidate stacks"
on public.candidate_stacks for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read candidate stack members"
on public.candidate_stack_members for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert candidate stack members"
on public.candidate_stack_members for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update candidate stack members"
on public.candidate_stack_members for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete candidate stack members"
on public.candidate_stack_members for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read runs"
on public.evaluation_runs for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert runs"
on public.evaluation_runs for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update runs"
on public.evaluation_runs for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete runs"
on public.evaluation_runs for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read guard outputs"
on public.guard_outputs for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "service roles can insert guard outputs"
on public.guard_outputs for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform']::public.workspace_role[]));

create policy "members can read measurement recommendations"
on public.measurement_recommendations for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert measurement recommendations"
on public.measurement_recommendations for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update measurement recommendations"
on public.measurement_recommendations for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete measurement recommendations"
on public.measurement_recommendations for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read certificates"
on public.certificates for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "security roles can insert certificates"
on public.certificates for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','security','risk_reviewer']::public.workspace_role[]));

create policy "security roles can update certificates"
on public.certificates for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','security','risk_reviewer']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','security','risk_reviewer']::public.workspace_role[]));

create policy "security roles can delete certificates"
on public.certificates for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','security','risk_reviewer']::public.workspace_role[]));

create policy "members can read certificate signoffs"
on public.certificate_signoffs for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "reviewers can create certificate signoffs"
on public.certificate_signoffs for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','security','risk_reviewer']::public.workspace_role[]));

create policy "members can read drift signals"
on public.drift_signals for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "security roles can insert drift signals"
on public.drift_signals for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "security roles can update drift signals"
on public.drift_signals for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "security roles can delete drift signals"
on public.drift_signals for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read jobs"
on public.jobs for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert jobs"
on public.jobs for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update jobs"
on public.jobs for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete jobs"
on public.jobs for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "members can read usage events"
on public.usage_events for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "members can read audit events"
on public.audit_events for select to authenticated
using (workspace_id is null or private.is_workspace_member(workspace_id));

create policy "system actors can create audit events"
on public.audit_events for insert to authenticated
with check (workspace_id is null or private.is_workspace_member(workspace_id));

create policy "members can read artifact metadata"
on public.artifact_objects for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert artifact metadata"
on public.artifact_objects for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update artifact metadata"
on public.artifact_objects for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can delete artifact metadata"
on public.artifact_objects for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema public to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 52428800, null),
  ('run-artifacts', 'run-artifacts', false, 104857600, null),
  ('certificates', 'certificates', false, 52428800, null),
  ('exports', 'exports', false, 52428800, null),
  ('debug-artifacts', 'debug-artifacts', false, 52428800, null)
on conflict (id) do nothing;

create policy "workspace members can read storage objects"
on storage.objects for select to authenticated
using (
  bucket_id in ('uploads', 'run-artifacts', 'certificates', 'exports', 'debug-artifacts')
  and exists (
    select 1
    from public.artifact_objects ao
    where ao.bucket = storage.objects.bucket_id
      and ao.object_path = storage.objects.name
      and private.is_workspace_member(ao.workspace_id)
  )
);

create policy "workspace platform roles can upload storage objects"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('uploads', 'run-artifacts', 'certificates', 'exports', 'debug-artifacts')
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and private.has_workspace_role(
    split_part(name, '/', 1)::uuid,
    array['owner','admin','platform','security']::public.workspace_role[]
  )
);
