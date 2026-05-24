alter table public.projects
add column if not exists setup_status text not null default 'ready_for_setup';

create index if not exists projects_workspace_setup_status_idx
on public.projects (workspace_id, setup_status);
