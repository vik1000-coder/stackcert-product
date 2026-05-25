create table public.workspace_budget_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  monthly_cap_usd numeric check (monthly_cap_usd is null or monthly_cap_usd >= 0),
  per_run_cap_usd numeric check (per_run_cap_usd is null or per_run_cap_usd >= 0),
  measurement_cap_usd numeric check (measurement_cap_usd is null or measurement_cap_usd >= 0),
  alert_threshold_pct numeric not null default 0.8 check (alert_threshold_pct >= 0 and alert_threshold_pct <= 1.5),
  hard_stop_pct numeric not null default 1.0 check (hard_stop_pct >= 0 and hard_stop_pct <= 2),
  enforce_hard_stop boolean not null default true,
  provider_spend_disabled boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table public.project_budget_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  monthly_cap_usd numeric check (monthly_cap_usd is null or monthly_cap_usd >= 0),
  per_run_cap_usd numeric check (per_run_cap_usd is null or per_run_cap_usd >= 0),
  measurement_cap_usd numeric check (measurement_cap_usd is null or measurement_cap_usd >= 0),
  provider_spend_disabled boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id),
  unique (workspace_id, project_id)
);

create index on public.workspace_budget_policies (workspace_id);
create index on public.project_budget_policies (workspace_id, project_id);

create trigger set_workspace_budget_policies_updated_at before update on public.workspace_budget_policies
for each row execute function public.set_updated_at();

create trigger set_project_budget_policies_updated_at before update on public.project_budget_policies
for each row execute function public.set_updated_at();

alter table public.workspace_budget_policies enable row level security;
alter table public.project_budget_policies enable row level security;

create policy "members can read workspace budget policies"
on public.workspace_budget_policies for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "owners and admins can insert workspace budget policies"
on public.workspace_budget_policies for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "owners and admins can update workspace budget policies"
on public.workspace_budget_policies for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members can read project budget policies"
on public.project_budget_policies for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy "platform roles can insert project budget policies"
on public.project_budget_policies for insert to authenticated
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

create policy "platform roles can update project budget policies"
on public.project_budget_policies for update to authenticated
using (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]))
with check (private.has_workspace_role(workspace_id, array['owner','admin','platform','security']::public.workspace_role[]));

grant select, insert, update, delete on public.workspace_budget_policies to authenticated;
grant select, insert, update, delete on public.project_budget_policies to authenticated;
grant select, insert, update, delete on public.workspace_budget_policies to service_role;
grant select, insert, update, delete on public.project_budget_policies to service_role;
grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema public to service_role;
