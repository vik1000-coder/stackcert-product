# StackCert Release Gate GitHub Action

Gate a deployment on the current StackCert release report for one project.

```yaml
jobs:
  stackcert_release_gate:
    runs-on: ubuntu-latest
    steps:
      - uses: savikk129/multi_agents/stackcert_product/integrations/release-gates/github-action@main
        with:
          api-url: ${{ vars.STACKCERT_API_URL }}
          project-id: ${{ vars.STACKCERT_PROJECT_ID }}
          token: ${{ secrets.STACKCERT_RELEASE_GATE_TOKEN }}
          required-status: valid
          environment: production
```

The action calls `POST /api/projects/{project_id}/release-gates/evaluate` and
fails the job when StackCert returns `block` in `fail` mode. It emits
`decision`, `status`, `blocking-reasons`, and `warnings` outputs for follow-on
steps.

Use a release-gate-only StackCert machine token. Do not reuse user tokens or
MCP machine tokens for CI deployment checks.
