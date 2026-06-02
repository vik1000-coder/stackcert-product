alter table public.project_onboarding_profiles
  add column if not exists release_decision_owner text not null default 'Engineering lead',
  add column if not exists override_owner text not null default 'Shared committee',
  add column if not exists release_gate_mode text not null default 'warn'
    check (release_gate_mode in ('advisory', 'warn', 'block')),
  add column if not exists failure_response text not null default 'Open a manual release review before deployment.',
  add column if not exists signoff_roles text[] not null default array['engineering_lead','safety_reviewer']::text[],
  add column if not exists use_case_template text not null default 'customer_support'
    check (use_case_template in ('customer_support', 'internal_assistant', 'agentic_workflow', 'custom')),
  add column if not exists success_criteria text[] not null default '{}';

create table if not exists public.workspace_retention_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  raw_examples_retention_days integer check (raw_examples_retention_days is null or raw_examples_retention_days between 0 and 3650),
  keep_aggregate_metrics boolean not null default true,
  keep_redacted_snippets boolean not null default true,
  delete_provider_responses boolean not null default true,
  export_before_delete boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.project_retention_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  raw_examples_retention_days integer check (raw_examples_retention_days is null or raw_examples_retention_days between 0 and 3650),
  keep_aggregate_metrics boolean not null default true,
  keep_redacted_snippets boolean not null default true,
  delete_provider_responses boolean not null default true,
  export_before_delete boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

drop trigger if exists set_workspace_retention_policies_updated_at on public.workspace_retention_policies;
create trigger set_workspace_retention_policies_updated_at
before update on public.workspace_retention_policies
for each row execute function public.set_updated_at();

drop trigger if exists set_project_retention_policies_updated_at on public.project_retention_policies;
create trigger set_project_retention_policies_updated_at
before update on public.project_retention_policies
for each row execute function public.set_updated_at();

alter table public.workspace_retention_policies enable row level security;
alter table public.project_retention_policies enable row level security;

drop policy if exists "members can read workspace retention policies" on public.workspace_retention_policies;
create policy "members can read workspace retention policies"
on public.workspace_retention_policies for select to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "admins can manage workspace retention policies" on public.workspace_retention_policies;
create policy "admins can manage workspace retention policies"
on public.workspace_retention_policies for all to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

drop policy if exists "members can read project retention policies" on public.project_retention_policies;
create policy "members can read project retention policies"
on public.project_retention_policies for select to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "platform roles can manage project retention policies" on public.project_retention_policies;
create policy "platform roles can manage project retention policies"
on public.project_retention_policies for all to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

grant select, insert, update, delete on public.workspace_retention_policies to authenticated;
grant select, insert, update, delete on public.project_retention_policies to authenticated;
grant select, insert, update, delete on public.workspace_retention_policies to service_role;
grant select, insert, update, delete on public.project_retention_policies to service_role;
