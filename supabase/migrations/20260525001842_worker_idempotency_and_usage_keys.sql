alter table public.usage_events
add column if not exists external_event_id text;

create unique index if not exists guard_outputs_run_guard_example_idx
on public.guard_outputs (run_id, guard_key, external_example_id);

create unique index if not exists usage_events_workspace_external_event_id_idx
on public.usage_events (workspace_id, external_event_id);
