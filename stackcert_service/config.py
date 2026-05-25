from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _optional_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip().strip('"').strip("'")
    return stripped or None


@dataclass(frozen=True)
class Settings:
    app_name: str = "StackCert API"
    environment: str = os.getenv("STACKCERT_ENV", "local")
    product_root: Path = Path(__file__).resolve().parents[1]
    workspace_root: Path = Path(__file__).resolve().parents[2]
    demo_examples_path: Path = Path(
        os.getenv(
            "STACKCERT_DEMO_EXAMPLES",
            str(Path(__file__).resolve().parents[2] / "data" / "processed" / "examples_real_main_2000.jsonl"),
        )
    )
    demo_outputs_path: Path = Path(
        os.getenv(
            "STACKCERT_DEMO_OUTPUTS",
            str(Path(__file__).resolve().parents[2] / "data" / "outputs" / "real_main_2000_8agent_outputs.jsonl"),
        )
    )
    demo_weights_path: Path = Path(
        os.getenv(
            "STACKCERT_DEMO_WEIGHTS",
            str(Path(__file__).resolve().parents[2] / "configs" / "cass_real.json"),
        )
    )
    supabase_url: str | None = _optional_env("SUPABASE_URL")
    supabase_secret_key: str | None = _optional_env("SUPABASE_SECRET_KEY") or _optional_env("SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str | None = _optional_env("SUPABASE_JWT_SECRET")
    persistence_backend: str = os.getenv("STACKCERT_PERSISTENCE_BACKEND", "auto")
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "STACKCERT_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    )
    demo_workspace_id: str = "ws_demo"
    demo_project_id: str = "proj_acme_copilot"
    demo_run_id: str = "real_main_2000"
    demo_workspace_db_id: str = "00000000-0000-4000-8000-000000000001"
    demo_project_db_id: str = "00000000-0000-4000-8000-000000000101"
    enable_demo_workspace: bool = os.getenv("STACKCERT_ENABLE_DEMO_WORKSPACE", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


settings = Settings()
