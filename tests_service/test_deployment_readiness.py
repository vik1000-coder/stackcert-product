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

        self.assertIn("--web-url", smoke)
        self.assertIn("--api-url", smoke)
        self.assertIn("/auth/v1/token?grant_type=password", smoke)
        self.assertIn("/api/projects", smoke)


if __name__ == "__main__":
    unittest.main()
