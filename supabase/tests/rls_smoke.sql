-- Smoke checks intended for local CI once Supabase is available.
-- These tests document the expected security posture even before a full
-- pgTAP-based suite exists.

select 'rls_enabled' as check_name,
       relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and relkind = 'r'
  and relrowsecurity = false
  and relname not like 'schema_migrations';

