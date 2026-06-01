from pathlib import Path
import json
import xml.etree.ElementTree as ET
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DeploymentReadinessTests(unittest.TestCase):
    def read(self, relative_path: str) -> str:
        return (ROOT / relative_path).read_text(encoding="utf-8")

    def test_frontend_supports_supabase_storage_deployment(self):
        main = self.read("web/src/main.tsx")
        config = self.read("web/vite.config.ts")
        observability = self.read("web/src/lib/observability.ts")

        self.assertIn("HashRouter", main)
        self.assertIn("VITE_ROUTER_MODE", main)
        self.assertIn("VITE_PUBLIC_BASE", config)
        self.assertIn("configureFrontendObservability", main)
        self.assertIn("VITE_SENTRY_DSN", observability)

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
        worker = self.read("cloudflare/worker.ts")
        wrangler = self.read("wrangler.jsonc")
        vite_config = self.read("web/vite.config.ts")

        self.assertIn("python -m unittest discover -s tests_service", workflow)
        self.assertIn("VITE_ROUTER_MODE=hash", workflow)
        self.assertIn("supabase/functions/stackcert-api/index.ts", workflow)
        self.assertIn('incomingUrl.pathname === "/openapi.json"', worker)
        self.assertIn('"/openapi.json"', wrangler)
        self.assertIn("'/openapi.json'", vite_config)

    def test_deployment_smoke_script_covers_web_api_and_auth(self):
        smoke = self.read("scripts/deployment_smoke.py")
        pilot_smoke = self.read("scripts/hosted_uploaded_output_pilot_smoke.py")
        webhook_smoke = self.read("scripts/release_gate_webhook_smoke.py")
        ops_check = self.read("scripts/design_partner_ops_check.py")
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
        self.assertIn("/runs/uploaded-outputs/preview", pilot_smoke)
        self.assertIn("/certificate/issue", pilot_smoke)
        self.assertIn("/release-gates/evaluate", pilot_smoke)
        self.assertIn("X-StackCert-Signature", webhook_smoke)
        self.assertIn("/release-gates/webhook", webhook_smoke)
        self.assertIn("sentry_required", ops_check)
        self.assertIn("supabase_restore_rehearsal", ops_check)
        self.assertIn("cloud_run_alerts", ops_check)
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

    def test_release_gate_and_data_loading_integration_artifacts_exist(self):
        api = self.read("stackcert_service/main.py")
        integrations = self.read("stackcert_service/services/integrations.py")
        github_action = self.read("integrations/release-gates/github-action/action.yml")
        github_example = self.read("integrations/release-gates/github-actions.yml")
        gitlab = self.read("integrations/release-gates/gitlab-ci.yml")
        circle = self.read("integrations/release-gates/circleci-config.yml")
        webhook = self.read("integrations/release-gates/generic-webhook-request.json")
        docs = self.read("docs/20_release_gate_integrations.md")

        self.assertIn("/api/projects/{project_id}/benchmark-suites/schema", api)
        self.assertIn("/api/projects/{project_id}/trace-imports/preview", api)
        self.assertIn("/api/projects/{project_id}/trace-imports", api)
        self.assertIn("/api/projects/{project_id}/pilot-readiness", api)
        self.assertIn("/api/onboarding/pilots", api)
        self.assertIn("/api/projects/{project_id}/onboarding-profile", api)
        self.assertIn("/api/integrations/release-gates", api)
        self.assertIn("/api/projects/{project_id}/release-gates/webhook", api)
        self.assertIn("github_actions", integrations)
        self.assertIn("integrations/release-gates/github-action/action.yml", integrations)
        self.assertIn("gitlab_ci", integrations)
        self.assertIn("circleci", integrations)
        self.assertIn("signed_webhook_endpoint", integrations)
        self.assertIn("runs:\n  using: composite", github_action)
        self.assertIn("/release-gates/evaluate", github_action)
        self.assertIn("STACKCERT_RELEASE_GATE_TOKEN", github_example)
        self.assertIn("certificate_gate.py --release-gate", gitlab)
        self.assertIn("--base-url", gitlab)
        self.assertIn("--require", gitlab)
        self.assertIn("certificate_gate.py --release-gate", circle)
        self.assertIn("--base-url", circle)
        self.assertIn("--require", circle)
        self.assertIn("event_id", webhook)
        self.assertIn("prompt_hash", webhook)
        self.assertIn("X-StackCert-Signature", docs)
        self.assertIn("Context Matching", docs)

    def test_public_discovery_and_agent_index_files_exist(self):
        index = self.read("web/index.html")
        robots = self.read("web/public/robots.txt")
        sitemap = self.read("web/public/sitemap.xml")
        llms = self.read("web/public/llms.txt")
        security_txt = self.read("web/public/.well-known/security.txt")
        mcp_server = json.loads(self.read("web/public/.well-known/mcp/server.json"))
        manifest = json.loads(self.read("web/public/site.webmanifest"))

        self.assertIn('property="og:title"', index)
        self.assertIn('type="application/ld+json"', index)
        self.assertIn('"@type": "SoftwareApplication"', index)
        self.assertIn('rel="manifest"', index)
        self.assertIn("Sitemap: https://stackcert-staging.savikk129.workers.dev/sitemap.xml", robots)
        self.assertIn("Disallow: /app/", robots)
        self.assertIn("Disallow: /auth/", robots)
        root = ET.fromstring(sitemap)
        locations = [node.text for node in root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        self.assertIn("https://stackcert-staging.savikk129.workers.dev/integrations", locations)
        self.assertIn("https://stackcert-staging.savikk129.workers.dev/pilot-readiness", locations)
        self.assertIn("https://stackcert-staging.savikk129.workers.dev/procurement", locations)
        self.assertIn("https://stackcert-staging.savikk129.workers.dev/blog/two-thousand-example-test", locations)
        self.assertIn("# StackCert", llms)
        self.assertIn("MCP server registry metadata", llms)
        self.assertIn("GitHub composite action", llms)
        self.assertIn("Pilot readiness", llms)
        self.assertIn("Procurement FAQ", llms)
        self.assertIn("Expires: 2027-06-01T00:00:00Z", security_txt)
        self.assertEqual(mcp_server["remotes"][0]["type"], "streamable-http")
        self.assertEqual(mcp_server["remotes"][0]["url"], "https://stackcert-staging.savikk129.workers.dev/api/mcp")
        self.assertEqual(manifest["name"], "StackCert")

    def test_cloud_run_worker_entrypoint_and_admin_surface_exist(self):
        worker_module = self.read("stackcert_service/worker.py")
        api = self.read("stackcert_service/main.py")
        observability = self.read("stackcert_service/observability.py")
        app = self.read("web/src/App.tsx")
        admin_page = self.read("web/src/pages/AdminPage.tsx")

        self.assertIn("run_worker_once", worker_module)
        self.assertIn("--all-projects", worker_module)
        self.assertIn("STACKCERT_WORKER_ALL_PROJECTS", worker_module)
        self.assertIn("/api/workspaces/{workspace_id}/admin/overview", api)
        self.assertIn("/api/workspaces/{workspace_id}/admin/workers/run-next", api)
        self.assertIn("/api/jobs/{job_id}/cancel", api)
        self.assertIn("configure_error_reporting", api)
        self.assertIn("SENTRY_DSN", self.read("stackcert_service/config.py"))
        self.assertIn("sentry_sdk.init", observability)
        self.assertIn("AdminPage", app)
        self.assertIn("Run worker pass", admin_page)
        self.assertIn("Dead-letter review", admin_page)
        self.assertIn("Provider health", admin_page)


if __name__ == "__main__":
    unittest.main()
