alter table public.certificates
  add column if not exists packet_snapshot jsonb not null default '{}',
  add column if not exists artifact_refs jsonb not null default '[]',
  add column if not exists superseded_by uuid references public.certificates(id) on delete set null,
  add column if not exists superseded_at timestamptz,
  add column if not exists revoked_reason text;

alter table public.artifact_objects
  add column if not exists metadata jsonb not null default '{}';

create index if not exists artifact_objects_workspace_type_idx
on public.artifact_objects (workspace_id, artifact_type);

create index if not exists artifact_objects_metadata_idx
on public.artifact_objects using gin (metadata);

create or replace function private.prevent_certificate_core_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  revocation_update boolean;
begin
  revocation_update :=
    old.status is distinct from new.status
    and new.status = 'revoked'
    and new.revoked_at is not null;

  if old.workspace_id is distinct from new.workspace_id
    or old.project_id is distinct from new.project_id
    or old.run_id is distinct from new.run_id
    or old.certificate_key is distinct from new.certificate_key
    or (old.status is distinct from new.status and not revocation_update)
    or old.selected_stack_label is distinct from new.selected_stack_label
    or old.scope is distinct from new.scope
    or old.issued_by is distinct from new.issued_by
    or old.issued_at is distinct from new.issued_at
    or old.expires_at is distinct from new.expires_at
    or old.artifact_hash is distinct from new.artifact_hash
    or old.summary is distinct from new.summary
    or old.limitations is distinct from new.limitations
    or old.packet_snapshot is distinct from new.packet_snapshot
    or old.artifact_refs is distinct from new.artifact_refs
  then
    raise exception 'issued certificate core fields are immutable'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_certificate_core_update on public.certificates;
create trigger prevent_certificate_core_update
before update on public.certificates
for each row
execute function private.prevent_certificate_core_update();

create or replace function private.prevent_certificate_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  raise exception 'issued certificate records are immutable and cannot be deleted'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists prevent_certificate_delete on public.certificates;
create trigger prevent_certificate_delete
before delete on public.certificates
for each row
execute function private.prevent_certificate_delete();
