from __future__ import annotations

import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient

from stackcert_service.config import settings
from stackcert_service.main import app
from stackcert_service.schemas import ProjectCreate, WorkspaceCreate
from stackcert_service.security import access
from stackcert_service.security.auth import Principal, current_principal
from stackcert_service.services import audit
from stackcert_service.services import projects


class AccessHelperTest(unittest.TestCase):
    def setUp(self) -> None:
        self.old_environment = settings.environment

    def tearDown(self) -> None:
        projects.clear_setup_records()
        object.__setattr__(settings, "environment", self.old_environment)

    def test_role_aliases_and_groups(self) -> None:
        self.assertEqual(access.normalize_role("maintainer"), "platform")
        self.assertTrue(access.role_in_group("platform", "project_maintainer"))
        self.assertTrue(access.role_in_group("risk_reviewer", "evidence_reviewer"))
        self.assertFalse(access.role_in_group("viewer", "project_maintainer"))
        self.assertTrue(access.role_allows("admin", "security"))
        self.assertFalse(access.role_allows("security", "admin"))

    def test_requires_scope_for_machine_tokens(self) -> None:
        principal = Principal(
            user_id="machine:ci",
            email=None,
            role="machine",
            principal_type="machine",
            scopes=("mcp:read",),
        )

        access.require_scope(principal, "mcp:read")
        with self.assertRaises(HTTPException) as context:
            access.require_scope(principal, "mcp:write")

        self.assertEqual(context.exception.status_code, 403)

    def test_machine_tokens_cannot_use_workspace_membership(self) -> None:
        principal = Principal(
            user_id="machine:ci",
            email=None,
            role="machine",
            principal_type="machine",
            scopes=("mcp:read", "mcp:write"),
        )

        with self.assertRaises(HTTPException) as context:
            access.grant_from_workspace(principal, "ws_any")

        self.assertEqual(context.exception.status_code, 403)

    def test_non_production_demo_workspace_is_owner_for_local_user(self) -> None:
        object.__setattr__(settings, "environment", "local")
        principal = Principal(user_id="demo_user", email="demo@example.com", role="viewer", workspace_ids=())

        grant = access.grant_from_workspace(principal, settings.demo_workspace_id, required="project_maintainer")

        self.assertEqual(grant.role, "owner")

    def test_production_demo_exception_is_disabled(self) -> None:
        object.__setattr__(settings, "environment", "production")
        principal = Principal(user_id="demo_user", email="demo@example.com", role="owner", workspace_ids=())

        with self.assertRaises(HTTPException) as context:
            access.grant_from_workspace(principal, settings.demo_workspace_id)

        self.assertEqual(context.exception.status_code, 403)

    def test_project_access_uses_supplied_membership_role(self) -> None:
        principal = Principal(user_id="user_1", email="user@example.com", role="viewer", workspace_ids=())
        project = {"id": "proj_1", "workspace_id": "ws_1"}

        grant = access.grant_from_project(principal, project, membership_role="security", required="evidence_issuer")

        self.assertEqual(grant.workspace_id, "ws_1")
        self.assertEqual(grant.project_id, "proj_1")
        self.assertEqual(grant.role, "security")

    def test_project_access_denies_cross_tenant_without_membership(self) -> None:
        principal = Principal(user_id="user_1", email="user@example.com", role="owner", workspace_ids=("ws_a",))
        project = {"id": "proj_1", "workspace_id": "ws_b"}

        with self.assertRaises(HTTPException) as context:
            access.grant_from_project(principal, project)

        self.assertEqual(context.exception.status_code, 403)

    def test_local_project_listing_is_filtered_by_workspace_membership(self) -> None:
        owner_a = Principal(user_id="user_a", email="a@example.com", role="owner", workspace_ids=())
        owner_b = Principal(user_id="user_b", email="b@example.com", role="owner", workspace_ids=())

        workspace_a = projects.create_workspace(
            WorkspaceCreate(name="Workspace A", slug="workspace-a", plan="team"),
            principal=owner_a,
        )
        workspace_b = projects.create_workspace(
            WorkspaceCreate(name="Workspace B", slug="workspace-b", plan="team"),
            principal=owner_b,
        )
        project_a = projects.create_project(
            workspace_a["id"],
            ProjectCreate(
                name="Project A",
                slug="project-a",
                environment="production",
                risk_tier="standard",
                data_mode="redacted_snippets",
            ),
        )
        project_b = projects.create_project(
            workspace_b["id"],
            ProjectCreate(
                name="Project B",
                slug="project-b",
                environment="production",
                risk_tier="standard",
                data_mode="redacted_snippets",
            ),
        )

        visible_to_a = {project["id"] for project in projects.list_projects(owner_a)}
        visible_to_b = {project["id"] for project in projects.list_projects(owner_b)}

        self.assertIn(project_a["id"], visible_to_a)
        self.assertNotIn(project_b["id"], visible_to_a)
        self.assertIn(project_b["id"], visible_to_b)
        self.assertNotIn(project_a["id"], visible_to_b)


class RouteAccessTest(unittest.TestCase):
    def setUp(self) -> None:
        self.old_environment = settings.environment
        self.old_persistence_backend = settings.persistence_backend
        object.__setattr__(settings, "environment", "local")
        object.__setattr__(settings, "persistence_backend", "memory")
        projects.clear_setup_records()
        audit.clear_events()
        app.dependency_overrides.clear()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        audit.clear_events()
        projects.clear_setup_records()
        object.__setattr__(settings, "environment", self.old_environment)
        object.__setattr__(settings, "persistence_backend", self.old_persistence_backend)

    def test_project_routes_deny_cross_tenant_access(self) -> None:
        owner_a = Principal(user_id="user_a", email="a@example.com", role="owner", workspace_ids=())
        owner_b = Principal(user_id="user_b", email="b@example.com", role="owner", workspace_ids=())

        self._as(owner_a)
        workspace_a = self._create_workspace("Workspace A", "workspace-a")
        project_a = self._create_project(workspace_a["id"], "Project A", "project-a")

        self._as(owner_b)
        workspace_b = self._create_workspace("Workspace B", "workspace-b")
        project_b = self._create_project(workspace_b["id"], "Project B", "project-b")

        self._as(owner_a)
        list_response = self.client.get("/api/projects")
        self.assertEqual(list_response.status_code, 200)
        visible_ids = {project["id"] for project in list_response.json()["projects"]}
        self.assertIn(project_a["id"], visible_ids)
        self.assertNotIn(project_b["id"], visible_ids)

        denied = self.client.get(f"/api/projects/{project_b['id']}")
        self.assertEqual(denied.status_code, 403)

    def test_viewer_can_read_project_but_cannot_create_connector(self) -> None:
        owner = Principal(user_id="owner", email="owner@example.com", role="owner", workspace_ids=())
        self._as(owner)
        workspace = self._create_workspace("Security Lab", "security-lab")
        project = self._create_project(workspace["id"], "Support Agent", "support-agent")

        viewer = Principal(user_id="viewer", email="viewer@example.com", role="viewer", workspace_ids=(workspace["id"],))
        self._as(viewer)

        read_response = self.client.get(f"/api/projects/{project['id']}")
        self.assertEqual(read_response.status_code, 200)

        write_response = self.client.post(
            f"/api/projects/{project['id']}/guard-connectors",
            json={
                "guard_key": "refund_policy_guard",
                "display_name": "Refund policy guard",
                "guard_type": "uploaded_outputs",
                "adapter_type": "uploaded_outputs",
                "version": "v1",
            },
        )
        self.assertEqual(write_response.status_code, 403)

    def test_mutating_routes_write_audit_events(self) -> None:
        owner = Principal(user_id="owner", email="owner@example.com", role="owner", workspace_ids=())
        self._as(owner)

        workspace = self._create_workspace("Audit Lab", "audit-lab")
        project = self._create_project(workspace["id"], "Audit Agent", "audit-agent")
        connector_response = self.client.post(
            f"/api/projects/{project['id']}/guard-connectors",
            json={
                "guard_key": "refund_policy_guard",
                "display_name": "Refund policy guard",
                "guard_type": "uploaded_outputs",
                "adapter_type": "uploaded_outputs",
                "version": "v1",
            },
        )

        self.assertEqual(connector_response.status_code, 200)
        actions = [event["action"] for event in audit.list_events()]
        self.assertIn("workspace.created", actions)
        self.assertIn("project.created", actions)
        self.assertIn("guard_connector.created", actions)

    def test_mcp_tool_call_writes_audit_event(self) -> None:
        principal = Principal(user_id="auditor", email="auditor@example.com", role="owner", workspace_ids=(settings.demo_workspace_id,))
        self._as(principal)

        response = self.client.post(
            "/api/mcp/rpc",
            json={
                "jsonrpc": "2.0",
                "id": "audit-tool-call",
                "method": "tools/call",
                "params": {
                    "name": "get_release_evidence_status",
                    "arguments": {"project_id": settings.demo_project_id, "lambda_cost": 5},
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        actions = [event["action"] for event in audit.list_events()]
        self.assertIn("mcp.tool_called", actions)

    def _as(self, principal: Principal) -> None:
        app.dependency_overrides[current_principal] = lambda: principal

    def _create_workspace(self, name: str, slug: str) -> dict[str, str]:
        response = self.client.post("/api/workspaces", json={"name": name, "slug": slug, "plan": "team"})
        self.assertEqual(response.status_code, 200)
        return response.json()["workspace"]

    def _create_project(self, workspace_id: str, name: str, slug: str) -> dict[str, str]:
        response = self.client.post(
            f"/api/workspaces/{workspace_id}/projects",
            json={
                "name": name,
                "slug": slug,
                "environment": "production",
                "risk_tier": "standard",
                "data_mode": "redacted_snippets",
            },
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["project"]


if __name__ == "__main__":
    unittest.main()
