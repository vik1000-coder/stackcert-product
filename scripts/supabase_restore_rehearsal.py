"""Run a disposable Supabase restore rehearsal.

This script exercises the restore path for the linked Supabase database without
touching production. It restores selected schemas into a temporary Postgres
container, adds the minimal Supabase auth/role stubs needed by StackCert RLS
functions, and prints JSON evidence that can be copied into the design-partner
ops evidence file.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_SCHEMAS = "public,private,storage"
DEFAULT_IMAGE = "postgres:17-alpine"
DEFAULT_CONTAINER = "stackcert-restore-rehearsal"


PRELUDE_SQL = r"""
do $$
begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;
do $$
begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;
do $$
begin
  create role service_role nologin;
exception when duplicate_object then null;
end $$;
do $$
begin
  create role authenticator nologin;
exception when duplicate_object then null;
end $$;
do $$
begin
  create role supabase_admin nologin;
exception when duplicate_object then null;
end $$;
do $$
begin
  create role supabase_storage_admin nologin;
exception when duplicate_object then null;
end $$;
do $$
begin
  create role dashboard_user nologin;
exception when duplicate_object then null;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz default now()
);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;
create extension if not exists pgcrypto;
"""


VERIFY_SQL = r"""
with table_counts as (
  select table_schema, count(*)::int as table_count
  from information_schema.tables
  where table_schema in ('public', 'private', 'storage', 'auth')
    and table_type = 'BASE TABLE'
  group by table_schema
),
storage_bucket_count as (
  select count(*)::int as count
  from storage.buckets
),
storage_object_count as (
  select count(*)::int as count
  from storage.objects
),
artifact_object_count as (
  select count(*)::int as count
  from public.artifact_objects
)
select jsonb_build_object(
  'table_counts', coalesce((select jsonb_object_agg(table_schema, table_count) from table_counts), '{}'::jsonb),
  'storage_buckets', (select count from storage_bucket_count),
  'storage_objects', (select count from storage_object_count),
  'artifact_objects', (select count from artifact_object_count)
)::text;
"""


def _run(cmd: list[str], *, input_bytes: bytes | None = None, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(cmd, input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check)


def _require_tool(name: str) -> None:
    if not shutil.which(name):
        raise SystemExit(f"required tool not found on PATH: {name}")


def _docker_rm(container: str) -> None:
    _run(["docker", "rm", "-f", container], check=False)


def _start_postgres(container: str, image: str, password: str) -> int:
    _docker_rm(container)
    _run(
        [
            "docker",
            "run",
            "-d",
            "--rm",
            "--name",
            container,
            "-e",
            f"POSTGRES_PASSWORD={password}",
            "-e",
            "POSTGRES_DB=postgres",
            "-p",
            "127.0.0.1::5432",
            image,
        ]
    )
    for _ in range(60):
        ready = _run(["docker", "exec", container, "pg_isready", "-U", "postgres"], check=False)
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError("temporary Postgres container did not become ready")

    port = _run(["docker", "port", container, "5432/tcp"]).stdout.decode().strip().rsplit(":", 1)[-1]
    return int(port)


def _psql(container: str, sql: str, *, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return _run(
        ["docker", "exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-U", "postgres", "-d", "postgres"],
        input_bytes=sql.encode(),
        check=check,
    )


def _dump_schema(path: Path, schemas: str) -> None:
    _run(["supabase", "db", "dump", "--linked", "--schema", schemas, "--file", str(path)])


def _dump_storage_data(path: Path) -> None:
    _run(["supabase", "db", "dump", "--linked", "--schema", "storage", "--data-only", "--file", str(path)])


def _restore_file(container: str, path: Path) -> subprocess.CompletedProcess[bytes]:
    with path.open("rb") as handle:
        return _run(
            ["docker", "exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-U", "postgres", "-d", "postgres"],
            input_bytes=handle.read(),
        )


def run_rehearsal(args: argparse.Namespace) -> dict[str, Any]:
    _require_tool("docker")
    _require_tool("supabase")

    password = os.environ.get("STACKCERT_RESTORE_POSTGRES_PASSWORD", "stackcert-restore")
    started_at = datetime.now(UTC).isoformat(timespec="seconds")
    container = args.container
    with tempfile.TemporaryDirectory(prefix="stackcert_restore_") as tmp:
        tmp_dir = Path(tmp)
        schema_dump = tmp_dir / "schema.sql"
        storage_data_dump = tmp_dir / "storage_data.sql"

        _dump_schema(schema_dump, args.schemas)
        if args.include_storage_data:
            _dump_storage_data(storage_data_dump)

        port = _start_postgres(container, args.image, password)
        try:
            _psql(container, PRELUDE_SQL)
            schema_restore = _restore_file(container, schema_dump)
            storage_restore = None
            if args.include_storage_data:
                storage_restore = _restore_file(container, storage_data_dump)
            verify = _psql(container, VERIFY_SQL)
            verification = json.loads(verify.stdout.decode().strip().splitlines()[-1])
        finally:
            if not args.keep_container:
                _docker_rm(container)

    return {
        "status": "ok",
        "started_at": started_at,
        "schemas": args.schemas,
        "storage_data_included": bool(args.include_storage_data),
        "container": container,
        "image": args.image,
        "local_port": port,
        "schema_restore_exit": schema_restore.returncode,
        "storage_data_restore_exit": storage_restore.returncode if storage_restore else None,
        "verification": verification,
        "container_removed": not args.keep_container,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schemas", default=DEFAULT_SCHEMAS, help=f"Comma-separated schemas to dump and restore. Default: {DEFAULT_SCHEMAS}.")
    parser.add_argument("--include-storage-data", action="store_true", help="Also dump and restore Supabase storage schema data such as bucket/object metadata.")
    parser.add_argument("--image", default=DEFAULT_IMAGE, help=f"Temporary Postgres image. Default: {DEFAULT_IMAGE}.")
    parser.add_argument("--container", default=DEFAULT_CONTAINER, help=f"Temporary Docker container name. Default: {DEFAULT_CONTAINER}.")
    parser.add_argument("--keep-container", action="store_true", help="Leave the temporary Postgres container running for manual inspection.")
    args = parser.parse_args(argv)

    try:
        print(json.dumps(run_rehearsal(args), indent=2, sort_keys=True))
    except subprocess.CalledProcessError as error:
        stderr = error.stderr.decode(errors="replace").strip()
        stdout = error.stdout.decode(errors="replace").strip()
        print(json.dumps({"status": "failed", "cmd": error.cmd, "returncode": error.returncode, "stdout": stdout, "stderr": stderr}, indent=2), file=sys.stderr)
        return error.returncode or 1
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, indent=2), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
