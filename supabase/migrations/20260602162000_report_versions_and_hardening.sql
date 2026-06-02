create table if not exists public.report_versions (
  id text primary key,
  workspace_id text not null,
  project_id text not null,
  run_id text not null,
  certificate_id text,
  version integer not null check (version >= 1),
  content_hash text not null,
  release_context_hash text not null,
  renderer_version text not null,
  payload jsonb not null default '{}'::jsonb,
  markdown text not null default '',
  html text not null default '',
  artifact_refs jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  unique (run_id, version),
  unique (run_id, content_hash)
);

create index if not exists report_versions_project_created_idx on public.report_versions (project_id, created_at desc);
create index if not exists report_versions_run_version_idx on public.report_versions (run_id, version desc);

alter table public.report_versions enable row level security;

drop policy if exists "service role can manage report versions" on public.report_versions;
create policy "service role can manage report versions"
on public.report_versions
for all
to service_role
using (true)
with check (true);

grant select, insert on public.report_versions to service_role;
