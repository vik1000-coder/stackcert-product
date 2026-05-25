from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DeploymentReadinessTests(unittest.TestCase):
    def read(self, relative_path: str) -> str:
        return (ROOT / relative_path).read_text(encoding="utf-8")

    def test_frontend_supports_supabase_storage_deployment(self):
        main = self.read("web/src/main.tsx")
        config = self.read("web/vite.config.ts")

        self.assertIn("HashRouter", main)
        self.assertIn("VITE_ROUTER_MODE", main)
        self.assertIn("VITE_PUBLIC_BASE", config)

    def test_auth_page_supports_real_supabase_sign_in_and_sign_up(self):
        auth_page = self.read("web/src/pages/AuthPage.tsx")

        self.assertIn("signInWithPassword", auth_page)
        self.assertIn("signUp", auth_page)
        self.assertIn("Create account", auth_page)

    def test_supabase_edge_api_has_auth_gate_and_playable_routes(self):
        edge_function = self.read("supabase/functions/stackcert-api/index.ts")

        for expected in [
            "authenticatedUser",
            "/api/health",
            "/api/projects",
            "^\\/api\\/runs",
            "/api/mcp/manifest",
            "certificate.md",
            "Authentication required",
        ]:
            self.assertIn(expected, edge_function)

    def test_ci_runs_deployment_contracts_and_hosted_build(self):
        workflow = self.read(".github/workflows/ci.yml")

        self.assertIn("python -m unittest discover -s tests_service", workflow)
        self.assertIn("VITE_ROUTER_MODE=hash", workflow)
        self.assertIn("supabase/functions/stackcert-api/index.ts", workflow)

    def test_deployment_smoke_script_covers_web_api_and_auth(self):
        smoke = self.read("scripts/deployment_smoke.py")
        mcp_smoke = self.read("scripts/mcp_client_smoke.py")
        worker_smoke = self.read("scripts/cloud_run_worker_smoke.py")
        mcp_hash = self.read("scripts/hash_mcp_machine_token.py")
        release_gate_hash = self.read("scripts/hash_release_gate_token.py")
        certificate_gate = self.read("scripts/certificate_gate.py")
        certificate_workflow = self.read(".github/workflows/certificate-gate.yml")
        pages_workflow = self.read(".github/workflows/deploy-pages.yml")
        cloudflare_workflow = self.read(".github/workflows/deploy-cloudflare.yml")

        self.assertIn("--web-url", smoke)
        self.assertIn("--api-url", smoke)
        self.assertIn("/auth/v1/token?grant_type=password", smoke)
        self.assertIn("/api/projects", smoke)
        self.assertIn("/api/mcp/manifest", smoke)
        self.assertIn("/api/mcp", smoke)
        self.assertIn("/release-gates/evaluate", smoke)
        self.assertIn("get_release_evidence_status", smoke)
        self.assertIn("not_a_guarantee", smoke)
        self.assertIn("ClientSession", mcp_smoke)
        self.assertIn("--bearer-token", mcp_smoke)
        self.assertIn("streamable_http_client", mcp_smoke)
        self.assertIn("get_release_evidence_status", mcp_smoke)
        self.assertIn("gcloud", worker_smoke)
        self.assertIn("run", worker_smoke)
        self.assertIn("jobs", worker_smoke)
        self.assertIn("execute", worker_smoke)
        self.assertIn("/api/projects/proj_acme_copilot/evaluation-jobs", worker_smoke)
        self.assertIn("/api/jobs/{job_id}", worker_smoke)
        self.assertIn("STACKCERT_MCP_MACHINE_TOKEN_HASHES", mcp_hash)
        self.assertIn("STACKCERT_RELEASE_GATE_TOKEN_HASHES", release_gate_hash)
        self.assertIn("--release-gate", certificate_gate)
        self.assertIn("--release-gate", certificate_workflow)
        self.assertIn("sha256", mcp_hash)
        self.assertIn("scripts/mcp_client_smoke.py", pages_workflow)
        self.assertIn("scripts/mcp_client_smoke.py", cloudflare_workflow)

    def test_cloud_run_worker_entrypoint_and_admin_surface_exist(self):
        worker_module = self.read("stackcert_service/worker.py")
        api = self.read("stackcert_service/main.py")
        app = self.read("web/src/App.tsx")
        admin_page = self.read("web/src/pages/AdminPage.tsx")

        self.assertIn("run_worker_once", worker_module)
        self.assertIn("--all-projects", worker_module)
        self.assertIn("STACKCERT_WORKER_ALL_PROJECTS", worker_module)
        self.assertIn("/api/workspaces/{workspace_id}/admin/overview", api)
        self.assertIn("/api/workspaces/{workspace_id}/admin/workers/run-next", api)
        self.assertIn("/api/jobs/{job_id}/cancel", api)
        self.assertIn("AdminPage", app)
        self.assertIn("Run worker pass", admin_page)
        self.assertIn("Dead-letter review", admin_page)


if __name__ == "__main__":
    unittest.main()
