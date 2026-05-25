create table if not exists public.project_onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null default 'platform' check (role in ('platform', 'safety', 'risk', 'mixed')),
  evidence_mode text not null default 'uploaded_outputs' check (evidence_mode in ('uploaded_outputs', 'connected_guards', 'model_judge', 'trace_import', 'demo_first')),
  app_category text not null default 'customer_support' check (app_category in ('customer_support', 'internal_agent', 'research_copilot', 'code_assistant', 'workflow_automation', 'other')),
  deployment_stage text not null default 'pre_production' check (deployment_stage in ('exploration', 'pre_production', 'production_monitoring')),
  optimization_goal text not null default 'balanced' check (optimization_goal in ('safety_risk', 'cost', 'latency', 'user_friction', 'balanced')),
  primary_risk_concerns text[] not null default '{}',
  release_gate_target text not null default 'not_yet' check (release_gate_target in ('github_actions', 'gitlab', 'circleci', 'webhook', 'mcp_agent', 'not_yet')),
  budget_range text not null default 'under_100' check (budget_range in ('under_25', 'under_100', 'under_500', 'custom_later')),
  lambda_cost numeric not null default 5 check (lambda_cost >= 1 and lambda_cost <= 10),
  first_setup_focus text not null default 'setup#import-examples' check (first_setup_focus in ('setup#import-examples', 'setup#safety-options', 'setup#run-evidence', 'overview', 'certificate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists project_onboarding_profiles_workspace_idx
on public.project_onboarding_profiles (workspace_id, deployment_stage);

drop trigger if exists set_project_onboarding_profiles_updated_at on public.project_onboarding_profiles;
create trigger set_project_onboarding_profiles_updated_at
before update on public.project_onboarding_profiles
for each row execute function public.set_updated_at();

alter table public.project_onboarding_profiles enable row level security;

drop policy if exists "members can read onboarding profiles" on public.project_onboarding_profiles;
create policy "members can read onboarding profiles"
on public.project_onboarding_profiles for select to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "platform roles can insert onboarding profiles" on public.project_onboarding_profiles;
create policy "platform roles can insert onboarding profiles"
on public.project_onboarding_profiles for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

drop policy if exists "platform roles can update onboarding profiles" on public.project_onboarding_profiles;
create policy "platform roles can update onboarding profiles"
on public.project_onboarding_profiles for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

drop policy if exists "platform roles can delete onboarding profiles" on public.project_onboarding_profiles;
create policy "platform roles can delete onboarding profiles"
on public.project_onboarding_profiles for delete to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

grant select, insert, update, delete on public.project_onboarding_profiles to authenticated;
grant select, insert, update, delete on public.project_onboarding_profiles to service_role;
