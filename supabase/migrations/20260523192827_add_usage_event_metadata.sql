alter table public.usage_events
add column if not exists metadata jsonb not null default '{}';

create unique index if not exists evaluation_runs_workspace_external_run_id_idx
on public.evaluation_runs (workspace_id, external_run_id)
where external_run_id is not null;
