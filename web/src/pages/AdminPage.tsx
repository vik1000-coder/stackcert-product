import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Card, ErrorState, Explainer, LoadingState, PageHeader, Stat } from '../components/Primitives';
import { api, type AdminOverview, type BudgetPolicy, type BudgetState, type ProjectBudgetOverview, type RetentionPolicy, type StackCertJob } from '../lib/api';
import { useStackCertApp } from '../lib/appContext';
import { fmtUsd } from '../lib/format';

export function AdminPage() {
  const { workspaceId } = useStackCertApp();
  const queryClient = useQueryClient();
  const [maxJobs, setMaxJobs] = useState('3');
  const [leaseSeconds, setLeaseSeconds] = useState('900');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [workspaceBudgetDraft, setWorkspaceBudgetDraft] = useState<WorkspaceBudgetDraft>(emptyWorkspaceBudgetDraft());
  const [projectBudgetDraft, setProjectBudgetDraft] = useState<ProjectBudgetDraft>(emptyProjectBudgetDraft());
  const [retentionDays, setRetentionDays] = useState('30');
  const query = useQuery({
    queryKey: ['admin-overview', workspaceId],
    queryFn: () => api.adminOverview(workspaceId),
    refetchInterval: 20_000
  });
  const admin = query.data?.admin;
  const actionableJobs = useMemo(() => admin?.jobs.filter((job) => canRetry(job) || canCancel(job)) ?? [], [admin]);
  const projectIdsKey = useMemo(() => admin?.projects.map((project) => project.project.id).join('|') ?? '', [admin]);
  const selectedProject = useMemo(
    () => admin?.projects.find((project) => project.project.id === selectedProjectId) ?? admin?.projects[0],
    [admin, selectedProjectId]
  );
  const workspacePolicyKey = `${workspaceId}:${admin?.budget.policy.updated_at ?? admin?.budget.policy.source ?? 'pending'}`;
  const selectedProjectPolicyKey = `${selectedProject?.project.id ?? 'none'}:${selectedProject?.budget.project.policy.updated_at ?? selectedProject?.budget.project.policy.source ?? 'pending'}`;
  const workspaceRetention = useQuery({
    queryKey: ['workspace-retention-policy', workspaceId],
    queryFn: () => api.workspaceRetentionPolicy(workspaceId)
  });
  const projectRetention = useQuery({
    queryKey: ['project-retention-policy', selectedProject?.project.id],
    queryFn: () => api.projectRetentionPolicy(selectedProject!.project.id),
    enabled: Boolean(selectedProject?.project.id)
  });

  const refreshAdmin = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-overview', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['project-runs'] });
  };

  const runWorker = useMutation({
    mutationFn: () =>
      api.runWorkspaceWorker(workspaceId, {
        max_jobs: clampNumber(maxJobs, 1, 10),
        lease_seconds: clampNumber(leaseSeconds, 30, 3600)
      }),
    onSuccess: refreshAdmin
  });
  const retryJob = useMutation({
    mutationFn: (jobId: string) => api.retryJob(jobId),
    onSuccess: refreshAdmin
  });
  const cancelJob = useMutation({
    mutationFn: (jobId: string) => api.cancelJob(jobId),
    onSuccess: refreshAdmin
  });
  const updateWorkspaceBudget = useMutation({
    mutationFn: () => api.updateWorkspaceBudgetPolicy(workspaceId, workspaceDraftToPayload(workspaceBudgetDraft)),
    onSuccess: refreshAdmin
  });
  const updateProjectBudget = useMutation({
    mutationFn: () => {
      if (!selectedProject) throw new Error('Select an app before saving project budget controls.');
      return api.updateProjectBudgetPolicy(selectedProject.project.id, projectDraftToPayload(projectBudgetDraft));
    },
    onSuccess: refreshAdmin
  });
  const updateWorkspaceRetention = useMutation({
    mutationFn: () =>
      api.updateWorkspaceRetentionPolicy(workspaceId, {
        raw_examples_retention_days: clampNumber(retentionDays, 0, 3650),
        delete_provider_responses: true,
        export_before_delete: true
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-retention-policy', workspaceId] });
      refreshAdmin();
    }
  });
  const updateProjectRetention = useMutation({
    mutationFn: () => {
      if (!selectedProject) throw new Error('Select an app before saving retention controls.');
      return api.updateProjectRetentionPolicy(selectedProject.project.id, {
        raw_examples_retention_days: clampNumber(retentionDays, 0, 3650),
        delete_provider_responses: true,
        export_before_delete: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-retention-policy', selectedProject?.project.id] });
      refreshAdmin();
    }
  });
  const dryRunRetention = useMutation({
    mutationFn: () => {
      if (!selectedProject) throw new Error('Select an app before previewing retention.');
      return api.dryRunProjectRetention(selectedProject.project.id);
    }
  });
  const applyRetention = useMutation({
    mutationFn: () => {
      if (!selectedProject) throw new Error('Select an app before applying retention.');
      return api.applyProjectRetention(selectedProject.project.id);
    },
    onSuccess: refreshAdmin
  });

  useEffect(() => {
    if (!admin) return;
    setWorkspaceBudgetDraft(workspacePolicyToDraft(admin.budget.policy));
  }, [workspacePolicyKey]);

  useEffect(() => {
    if (!admin?.projects.length) {
      setSelectedProjectId('');
      return;
    }
    if (!selectedProjectId || !admin.projects.some((project) => project.project.id === selectedProjectId)) {
      setSelectedProjectId(admin.projects[0].project.id);
    }
  }, [projectIdsKey, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) return;
    setProjectBudgetDraft(projectPolicyToDraft(selectedProject.budget.project.policy));
  }, [selectedProjectPolicyKey]);

  if (query.isLoading) return <LoadingState />;
  if (query.error || !admin) return <ErrorState error={query.error || new Error('Admin overview unavailable.')} />;

  return (
    <div className="page">
      <PageHeader
        title="Admin operations"
        subtitle="Monitor worker health, spend, release-report readiness, connector setup, and audit activity across this team."
        actions={
          <>
            <label className="btn" style={{ gap: 8 }}>
              <span>Jobs</span>
              <input
                aria-label="Maximum jobs to process"
                className="mono admin-inline-input"
                inputMode="numeric"
                value={maxJobs}
                onChange={(event) => setMaxJobs(event.currentTarget.value)}
              />
            </label>
            <label className="btn" style={{ gap: 8 }}>
              <span>Lease</span>
              <input
                aria-label="Lease seconds"
                className="mono admin-inline-input"
                inputMode="numeric"
                value={leaseSeconds}
                onChange={(event) => setLeaseSeconds(event.currentTarget.value)}
              />
            </label>
            <button className="btn primary" disabled={runWorker.isPending || !admin.controls.can_run_worker} onClick={() => runWorker.mutate()}>
              {runWorker.isPending ? 'Running worker...' : 'Run worker pass'}
            </button>
          </>
        }
      />

      <Explainer title="Operational posture" tone={admin.worker.dead_letters || admin.worker.stale_running ? 'warn' : 'accent'} style={{ marginBottom: 16 }}>
        <p>{admin.worker.recommended_action}</p>
      </Explainer>

      <div className="grid grid-4">
        <Stat label="Actual spend" value={fmtUsd(admin.metrics.actual_cost_usd, 2)} tone={admin.metrics.actual_cost_usd > 0 ? 'ok' : undefined} description="Ledgered provider and worker spend across the team." />
        <Stat label="Queued jobs" value={String(admin.metrics.queued_jobs)} tone={admin.metrics.queued_jobs ? 'warn' : undefined} description="Runnable work waiting for the Cloud Run worker job." />
        <Stat label="Dead letters" value={String(admin.metrics.dead_letter_jobs)} tone={admin.metrics.dead_letter_jobs ? 'bad' : undefined} description="Jobs that need operator review before retry." />
        <Stat label="Missing secrets" value={String(admin.metrics.missing_secret_connectors)} tone={admin.metrics.missing_secret_connectors ? 'warn' : undefined} description="REST or model-judge checks without usable secret material." />
      </div>

      <Card style={{ marginTop: 16 }}>
        <div className="admin-budget-head">
          <div>
            <h2 className="admin-section-title">Budget controls</h2>
            <p className="muted admin-budget-copy">
              Caps are enforced before queued worker runs and measurement plans can spend provider budget.
            </p>
          </div>
          <BudgetStatus state={admin.budget.state} />
        </div>
        <BudgetMeter state={admin.budget.state} />

        <div className="admin-budget-grid">
          <form
            className="admin-budget-form"
            onSubmit={(event) => {
              event.preventDefault();
              updateWorkspaceBudget.mutate();
            }}
          >
            <div className="admin-budget-subhead">
              <strong>Team policy</strong>
              <span className="muted">Applies across every app in {admin.workspace.name}.</span>
            </div>
            <BudgetNumberInput label="Monthly cap" value={workspaceBudgetDraft.monthlyCapUsd} onChange={(value) => setWorkspaceBudgetDraft((draft) => ({ ...draft, monthlyCapUsd: value }))} />
            <BudgetNumberInput label="Per-run cap" value={workspaceBudgetDraft.perRunCapUsd} onChange={(value) => setWorkspaceBudgetDraft((draft) => ({ ...draft, perRunCapUsd: value }))} />
            <BudgetNumberInput label="Measurement cap" value={workspaceBudgetDraft.measurementCapUsd} onChange={(value) => setWorkspaceBudgetDraft((draft) => ({ ...draft, measurementCapUsd: value }))} />
            <BudgetNumberInput label="Alert at %" value={workspaceBudgetDraft.alertThresholdPct} onChange={(value) => setWorkspaceBudgetDraft((draft) => ({ ...draft, alertThresholdPct: value }))} step="1" />
            <BudgetNumberInput label="Hard stop %" value={workspaceBudgetDraft.hardStopPct} onChange={(value) => setWorkspaceBudgetDraft((draft) => ({ ...draft, hardStopPct: value }))} step="1" />
            <label className="admin-budget-toggle">
              <input
                type="checkbox"
                checked={workspaceBudgetDraft.enforceHardStop}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setWorkspaceBudgetDraft((draft) => ({ ...draft, enforceHardStop: checked }));
                }}
              />
              <span>Enforce hard stop</span>
            </label>
            <label className="admin-budget-toggle">
              <input
                type="checkbox"
                checked={workspaceBudgetDraft.providerSpendDisabled}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setWorkspaceBudgetDraft((draft) => ({ ...draft, providerSpendDisabled: checked }));
                }}
              />
              <span>Pause provider spend</span>
            </label>
            <label className="admin-budget-notes">
              <span>Operator notes</span>
              <textarea
                value={workspaceBudgetDraft.notes}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setWorkspaceBudgetDraft((draft) => ({ ...draft, notes: value }));
                }}
              />
            </label>
            <button className="btn primary" disabled={updateWorkspaceBudget.isPending} type="submit">
              {updateWorkspaceBudget.isPending ? 'Saving...' : 'Save team policy'}
            </button>
            {updateWorkspaceBudget.isError ? <div className="form-error">{errorText(updateWorkspaceBudget.error, 'Could not save team budget policy.')}</div> : null}
          </form>

          <form
            className="admin-budget-form"
            onSubmit={(event) => {
              event.preventDefault();
              updateProjectBudget.mutate();
            }}
          >
            <div className="admin-budget-subhead">
              <strong>Project override</strong>
              <select value={selectedProject?.project.id ?? ''} onChange={(event) => setSelectedProjectId(event.currentTarget.value)}>
                {admin.projects.map((project) => (
                  <option key={project.project.id} value={project.project.id}>
                    {project.project.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedProject ? (
              <>
                <BudgetProjectSummary budget={selectedProject.budget} />
                <BudgetNumberInput label="Monthly cap" value={projectBudgetDraft.monthlyCapUsd} onChange={(value) => setProjectBudgetDraft((draft) => ({ ...draft, monthlyCapUsd: value }))} />
                <BudgetNumberInput label="Per-run cap" value={projectBudgetDraft.perRunCapUsd} onChange={(value) => setProjectBudgetDraft((draft) => ({ ...draft, perRunCapUsd: value }))} />
                <BudgetNumberInput label="Measurement cap" value={projectBudgetDraft.measurementCapUsd} onChange={(value) => setProjectBudgetDraft((draft) => ({ ...draft, measurementCapUsd: value }))} />
                <label className="admin-budget-toggle">
                  <input
                    type="checkbox"
                    checked={projectBudgetDraft.providerSpendDisabled}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setProjectBudgetDraft((draft) => ({ ...draft, providerSpendDisabled: checked }));
                    }}
                  />
                  <span>Pause provider spend for this app</span>
                </label>
                <label className="admin-budget-notes">
                  <span>Override notes</span>
                  <textarea
                    value={projectBudgetDraft.notes}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setProjectBudgetDraft((draft) => ({ ...draft, notes: value }));
                    }}
                  />
                </label>
                <button className="btn primary" disabled={updateProjectBudget.isPending} type="submit">
                  {updateProjectBudget.isPending ? 'Saving...' : 'Save project override'}
                </button>
                {updateProjectBudget.isError ? <div className="form-error">{errorText(updateProjectBudget.error, 'Could not save project budget policy.')}</div> : null}
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Create a project before adding overrides.</p>
            )}
          </form>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div className="admin-budget-subhead">
          <div>
            <h2 className="admin-section-title">Retention and deletion</h2>
            <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
              Hosted pilots should keep raw examples briefly, retain aggregates for reports, and delete provider responses unless the buyer approves longer storage.
            </p>
          </div>
          <label className="btn" style={{ gap: 8 }}>
            <span>Raw days</span>
            <input
              aria-label="Raw example retention days"
              className="mono admin-inline-input"
              inputMode="numeric"
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.currentTarget.value)}
            />
          </label>
        </div>
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <RetentionSummary title="Workspace default" policy={workspaceRetention.data?.retention_policy} loading={workspaceRetention.isLoading} />
          <RetentionSummary title="Selected app override" policy={projectRetention.data?.retention_policy} loading={projectRetention.isLoading} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <button className="btn" disabled={updateWorkspaceRetention.isPending} onClick={() => updateWorkspaceRetention.mutate()}>
            Save workspace retention
          </button>
          <button className="btn primary" disabled={!selectedProject || updateProjectRetention.isPending} onClick={() => updateProjectRetention.mutate()}>
            Save app retention
          </button>
          <button className="btn" disabled={!selectedProject || dryRunRetention.isPending} onClick={() => dryRunRetention.mutate()}>
            Preview deletion
          </button>
          <button className="btn primary" disabled={!selectedProject || applyRetention.isPending} onClick={() => applyRetention.mutate()}>
            Apply deletion policy
          </button>
        </div>
        {dryRunRetention.data || applyRetention.data ? (
          <div className="notice" style={{ marginTop: 12 }}>
            <strong>{applyRetention.data ? 'Retention applied' : 'Retention preview'}</strong>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {(applyRetention.data?.retention_execution.actions ?? dryRunRetention.data?.retention_execution.actions ?? []).map((action) => (
                <div key={action.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>{action.label}</span>
                  <span className="mono">{action.action} · {action.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {updateWorkspaceRetention.isError || updateProjectRetention.isError ? (
          <div className="form-error" style={{ marginTop: 10 }}>
            {errorText(updateWorkspaceRetention.error ?? updateProjectRetention.error, 'Could not save retention policy.')}
          </div>
        ) : null}
      </Card>

      <div className="grid admin-status-grid" style={{ marginTop: 16 }}>
        <Card>
          <h2 className="admin-section-title">Worker health</h2>
          <div className="admin-metric-grid">
            <MiniMetric label="Queue depth" value={String(admin.worker.queue_depth)} />
            <MiniMetric label="Running" value={String(admin.worker.running)} />
            <MiniMetric label="Stale leases" value={String(admin.worker.stale_running)} />
            <MiniMetric label="Failed" value={String(admin.worker.failed)} />
          </div>
          <dl className="definition-list" style={{ marginTop: 16 }}>
            <AdminDefinition term="Oldest queued">{formatTime(admin.worker.oldest_queued_at)}</AdminDefinition>
            <AdminDefinition term="Next retry">{formatTime(admin.worker.next_retry_at)}</AdminDefinition>
            <AdminDefinition term="Manual run cap">{admin.controls.max_jobs_per_manual_run} jobs per pass</AdminDefinition>
            <AdminDefinition term="Scope">{admin.controls.worker_scope}</AdminDefinition>
          </dl>
          {runWorker.isSuccess ? (
            <div className="notice" style={{ marginTop: 14 }}>
              Worker {runWorker.data.worker_run.worker_id} processed {runWorker.data.worker_run.processed_count} job(s).
            </div>
          ) : null}
          {runWorker.isError ? (
            <div className="notice bad" style={{ marginTop: 14 }}>
              {errorText(runWorker.error, 'Could not run the worker pass.')}
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="admin-section-title">Usage and throughput</h2>
          <div className="admin-metric-grid">
            <MiniMetric label="Requests" value={admin.metrics.request_count.toLocaleString()} />
            <MiniMetric label="Input tokens" value={admin.metrics.input_tokens.toLocaleString()} />
            <MiniMetric label="Output tokens" value={admin.metrics.output_tokens.toLocaleString()} />
            <MiniMetric label="Estimated spend" value={fmtUsd(admin.metrics.estimated_cost_usd, 2)} />
          </div>
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th className="right">Requests</th>
                  <th className="right">Tokens</th>
                  <th className="right">Actual</th>
                </tr>
              </thead>
              <tbody>
                {admin.usage.by_provider.length ? (
                  admin.usage.by_provider.map((provider) => (
                    <tr key={provider.provider}>
                      <td>{provider.provider}</td>
                      <td className="mono right">{provider.request_count.toLocaleString()}</td>
                      <td className="mono right">{(provider.input_tokens + provider.output_tokens).toLocaleString()}</td>
                      <td className="mono right">{fmtUsd(provider.actual_cost_usd, 4)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="muted">
                      No provider usage has been ledgered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ProviderHealthPanel providerHealth={admin.provider_health} />

      <Card style={{ marginTop: 16 }}>
        <h2 className="admin-section-title">Team apps</h2>
        <div className="table-wrap admin-project-table">
          <table>
            <thead>
              <tr>
                <th>App</th>
                <th>Status</th>
                <th className="right">Runs</th>
                <th className="right">Jobs</th>
                <th className="right">Spend</th>
                <th>Budget</th>
                <th>Connectors</th>
              </tr>
            </thead>
            <tbody>
              {admin.projects.map((project) => (
                <tr key={project.project.id}>
                  <td>
                    <strong>{project.project.name}</strong>
                    <div className="mono muted" style={{ marginTop: 4, fontSize: 11 }}>{project.project.slug}</div>
                  </td>
                  <td>
                    <Badge tone={project.runs.latest_certificate_status}>{project.runs.latest_certificate_status}</Badge>
                    <div className="muted" style={{ marginTop: 5, fontSize: 12 }}>
                      {project.runs.latest_completed_at ? `Last run ${formatTime(project.runs.latest_completed_at)}` : project.project.setup_status ?? 'setup pending'}
                    </div>
                  </td>
                  <td className="mono right">{project.runs.total}</td>
                  <td className="mono right">
                    {project.jobs.queued} queued / {project.jobs.running} running / {project.jobs.failed} failed
                  </td>
                  <td className="mono right">{fmtUsd(project.usage.actual_cost_usd, 4)}</td>
                  <td>
                    <Badge tone={project.budget.status}>{project.budget.status}</Badge>
                    <div className="muted" style={{ marginTop: 5, fontSize: 12 }}>
                      {project.budget.effective.per_run_cap_usd == null ? 'No per-run cap' : `${fmtUsd(project.budget.effective.per_run_cap_usd, 2)} per run`}
                    </div>
                  </td>
                  <td>
                    <span>{project.connectors.active}/{project.connectors.total} active</span>
                    {project.connectors.missing_secrets ? (
                      <div className="muted" style={{ marginTop: 5, fontSize: 12 }}>
                        {project.connectors.missing_secrets} missing secret(s)
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-project-mobile-list">
          {admin.projects.map((project) => (
            <div key={project.project.id} className="admin-project-mobile-row">
              <div className="admin-row-title">
                <strong>{project.project.name}</strong>
                <Badge tone={project.runs.latest_certificate_status}>{project.runs.latest_certificate_status}</Badge>
              </div>
              <div className="mono muted admin-row-id">{project.project.slug}</div>
              <dl className="definition-list" style={{ marginTop: 10 }}>
                <AdminDefinition term="Runs">{project.runs.total}</AdminDefinition>
                <AdminDefinition term="Jobs">
                  {project.jobs.queued} queued / {project.jobs.running} running / {project.jobs.failed} failed
                </AdminDefinition>
                <AdminDefinition term="Spend">{fmtUsd(project.usage.actual_cost_usd, 4)}</AdminDefinition>
                <AdminDefinition term="Budget">
                  {project.budget.status}; {project.budget.effective.per_run_cap_usd == null ? 'no per-run cap' : `${fmtUsd(project.budget.effective.per_run_cap_usd, 2)} per run`}
                </AdminDefinition>
                <AdminDefinition term="Connectors">
                  {project.connectors.active}/{project.connectors.total} active
                  {project.connectors.missing_secrets ? `, ${project.connectors.missing_secrets} missing secret(s)` : ''}
                </AdminDefinition>
              </dl>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <h2 className="admin-section-title">Job controls</h2>
          {actionableJobs.length ? (
            <div className="admin-job-list">
              {actionableJobs.slice(0, 12).map((job) => (
                <JobControlRow key={job.id} job={job} retryJob={(jobId) => retryJob.mutate(jobId)} cancelJob={(jobId) => cancelJob.mutate(jobId)} busy={retryJob.isPending || cancelJob.isPending} />
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No queued, failed, or expired jobs need operator action.</p>
          )}
          {retryJob.isSuccess ? <div className="notice" style={{ marginTop: 14 }}>Job requeued for the worker.</div> : null}
          {cancelJob.isSuccess ? <div className="notice" style={{ marginTop: 14 }}>Job canceled before another worker pass could spend budget.</div> : null}
          {(retryJob.isError || cancelJob.isError) ? (
            <div className="notice bad" style={{ marginTop: 14 }}>
              {errorText(retryJob.error || cancelJob.error, 'Could not update the job.')}
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="admin-section-title">Dead-letter review</h2>
          {admin.dead_letters.length ? (
            <div className="admin-job-list">
              {admin.dead_letters.slice(0, 8).map((job) => (
                <div key={job.id} className="admin-job-row">
                  <div>
                    <div className="admin-row-title">
                      <Badge tone={job.status}>{job.status}</Badge>
                      <span>{job.project_name ?? job.project_id}</span>
                    </div>
                    <div className="mono muted admin-row-id">{job.id}</div>
                    <p className="muted admin-row-copy">{job.dead_letter_reason ?? redactProviderError(job.error)}</p>
                  </div>
                  {canRetry(job) ? (
                    <button className="btn" disabled={retryJob.isPending} onClick={() => retryJob.mutate(job.id)}>
                      Retry
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No dead-lettered jobs. Failed provider calls will appear here with secrets redacted.</p>
          )}
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <h2 className="admin-section-title">Audit trail</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {admin.audit_events.length ? (
                admin.audit_events.map((event) => (
                  <tr key={event.id}>
                    <td className="mono">{formatTime(event.created_at)}</td>
                    <td>{event.action.replaceAll('_', ' ').replaceAll('.', ' / ')}</td>
                    <td>{event.actor || event.actor_type || 'machine'}</td>
                    <td className="mono">{event.target_id ?? event.project_id ?? event.workspace_id ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="muted">
                    No audit events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ProviderHealthPanel({ providerHealth }: { providerHealth: AdminOverview['provider_health'] }) {
  const tone = providerHealth.status === 'attention' ? 'warn' : providerHealth.status === 'healthy' ? 'ok' : 'neutral';
  return (
    <Card style={{ marginTop: 16 }}>
      <div className="admin-budget-head">
        <div>
          <h2 className="admin-section-title">Provider health</h2>
          <p className="muted admin-budget-copy">
            Managed REST and model-judge runs stay advanced/beta. StackCert does not host customer models; provider health tracks connected checks and worker execution.
          </p>
        </div>
        <Badge tone={tone}>{providerHealth.status}</Badge>
      </div>
      <div className="admin-metric-grid">
        <MiniMetric label="Providers" value={String(providerHealth.summary.providers)} />
        <MiniMetric label="Retries" value={String(providerHealth.summary.retry_count)} />
        <MiniMetric label="Rate limits" value={String(providerHealth.summary.rate_limit_failures)} />
        <MiniMetric label="Timeouts" value={String(providerHealth.summary.timeout_failures)} />
        <MiniMetric label="Dead letters" value={String(providerHealth.summary.dead_letter_count)} />
        <MiniMetric label="Actual spend" value={fmtUsd(providerHealth.summary.actual_cost_usd, 4)} />
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Status</th>
              <th className="right">Requests</th>
              <th className="right">Retries</th>
              <th className="right">Failures</th>
              <th>Latest redacted error</th>
            </tr>
          </thead>
          <tbody>
            {providerHealth.providers.length ? (
              providerHealth.providers.map((provider) => (
                <tr key={provider.provider}>
                  <td>{provider.provider}</td>
                  <td>
                    <Badge tone={provider.status === 'dead_letter' ? 'bad' : provider.status === 'retrying' ? 'warn' : 'ok'}>
                      {provider.status.replaceAll('_', ' ')}
                    </Badge>
                  </td>
                  <td className="mono right">{provider.request_count.toLocaleString()}</td>
                  <td className="mono right">{provider.retry_count.toLocaleString()}</td>
                  <td className="mono right">
                    {(provider.rate_limit_failures + provider.timeout_failures + provider.failed_jobs + provider.dead_letter_count).toLocaleString()}
                  </td>
                  <td className="muted">
                    {provider.latest_error_class ? `${provider.latest_error_class}: ${redactProviderError(provider.latest_error)}` : 'No provider errors recorded.'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="muted">
                  No managed provider runs yet. Fast uploaded-output pilots do not require StackCert-hosted models or provider calls.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-mini-metric">
      <div className="stat-label">{label}</div>
      <div className="mono admin-mini-value">{value}</div>
    </div>
  );
}

function AdminDefinition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="definition-row">
      <dt className="definition-term">{term}</dt>
      <dd className="definition-copy" style={{ margin: 0 }}>{children}</dd>
    </div>
  );
}

type WorkspaceBudgetDraft = {
  monthlyCapUsd: string;
  perRunCapUsd: string;
  measurementCapUsd: string;
  alertThresholdPct: string;
  hardStopPct: string;
  enforceHardStop: boolean;
  providerSpendDisabled: boolean;
  notes: string;
};

type ProjectBudgetDraft = {
  monthlyCapUsd: string;
  perRunCapUsd: string;
  measurementCapUsd: string;
  providerSpendDisabled: boolean;
  notes: string;
};

function BudgetStatus({ state }: { state: BudgetState }) {
  return (
    <div className="admin-budget-status">
      <Badge tone={state.status}>{state.status}</Badge>
      <span className="mono">{state.cap_usd == null ? 'No cap' : `${fmtUsd(state.projected_spend_usd, 2)} / ${fmtUsd(state.cap_usd, 2)}`}</span>
    </div>
  );
}

function BudgetMeter({ state }: { state: BudgetState }) {
  const percent = state.usage_percent == null ? 0 : Math.max(0, Math.min(1, state.usage_percent));
  return (
    <div className="admin-budget-meter" aria-label="Team budget usage">
      <span style={{ width: `${Math.round(percent * 100)}%` }} />
    </div>
  );
}

function BudgetProjectSummary({ budget }: { budget: ProjectBudgetOverview }) {
  return (
    <div className="admin-budget-project-summary">
      <BudgetStatus state={budget.project.state} />
      <dl className="definition-list">
        <AdminDefinition term="Effective run cap">
          {budget.effective.per_run_cap_usd == null ? 'Not configured' : fmtUsd(budget.effective.per_run_cap_usd, 2)}
        </AdminDefinition>
        <AdminDefinition term="Provider spend">
          {budget.effective.provider_spend_disabled ? 'Paused' : 'Enabled'}
        </AdminDefinition>
      </dl>
    </div>
  );
}

function RetentionSummary({ title, policy, loading }: { title: string; policy?: RetentionPolicy; loading: boolean }) {
  if (loading) return <p className="muted" style={{ margin: 0 }}>Loading {title.toLowerCase()}...</p>;
  if (!policy) return <p className="muted" style={{ margin: 0 }}>No retention policy has been saved yet.</p>;
  return (
    <div className="notice">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <strong>{title}</strong>
        <Badge tone="neutral">{policy.raw_examples_retention_days ?? 'unset'} raw days</Badge>
      </div>
      <dl className="definition-list" style={{ marginTop: 10 }}>
        <AdminDefinition term="Aggregates">{policy.keep_aggregate_metrics ? 'kept' : 'deleted'}</AdminDefinition>
        <AdminDefinition term="Redacted snippets">{policy.keep_redacted_snippets ? 'kept' : 'deleted'}</AdminDefinition>
        <AdminDefinition term="Provider responses">{policy.delete_provider_responses ? 'deleted' : 'retained'}</AdminDefinition>
        <AdminDefinition term="Export first">{policy.export_before_delete ? 'yes' : 'no'}</AdminDefinition>
      </dl>
    </div>
  );
}

function BudgetNumberInput({
  label,
  value,
  onChange,
  step = '0.01'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input min="0" step={step} type="number" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function emptyWorkspaceBudgetDraft(): WorkspaceBudgetDraft {
  return {
    monthlyCapUsd: '',
    perRunCapUsd: '',
    measurementCapUsd: '',
    alertThresholdPct: '80',
    hardStopPct: '100',
    enforceHardStop: true,
    providerSpendDisabled: false,
    notes: ''
  };
}

function emptyProjectBudgetDraft(): ProjectBudgetDraft {
  return {
    monthlyCapUsd: '',
    perRunCapUsd: '',
    measurementCapUsd: '',
    providerSpendDisabled: false,
    notes: ''
  };
}

function workspacePolicyToDraft(policy: BudgetPolicy): WorkspaceBudgetDraft {
  return {
    monthlyCapUsd: numberToInput(policy.monthly_cap_usd),
    perRunCapUsd: numberToInput(policy.per_run_cap_usd),
    measurementCapUsd: numberToInput(policy.measurement_cap_usd),
    alertThresholdPct: numberToInput((policy.alert_threshold_pct ?? 0.8) * 100),
    hardStopPct: numberToInput((policy.hard_stop_pct ?? 1) * 100),
    enforceHardStop: Boolean(policy.enforce_hard_stop ?? true),
    providerSpendDisabled: Boolean(policy.provider_spend_disabled),
    notes: policy.notes ?? ''
  };
}

function projectPolicyToDraft(policy: BudgetPolicy): ProjectBudgetDraft {
  return {
    monthlyCapUsd: numberToInput(policy.monthly_cap_usd),
    perRunCapUsd: numberToInput(policy.per_run_cap_usd),
    measurementCapUsd: numberToInput(policy.measurement_cap_usd),
    providerSpendDisabled: Boolean(policy.provider_spend_disabled),
    notes: policy.notes ?? ''
  };
}

function workspaceDraftToPayload(draft: WorkspaceBudgetDraft) {
  return {
    monthly_cap_usd: nullableNumber(draft.monthlyCapUsd),
    per_run_cap_usd: nullableNumber(draft.perRunCapUsd),
    measurement_cap_usd: nullableNumber(draft.measurementCapUsd),
    alert_threshold_pct: nullablePercent(draft.alertThresholdPct, 0.8),
    hard_stop_pct: nullablePercent(draft.hardStopPct, 1),
    enforce_hard_stop: draft.enforceHardStop,
    provider_spend_disabled: draft.providerSpendDisabled,
    notes: draft.notes.trim() || null
  };
}

function projectDraftToPayload(draft: ProjectBudgetDraft) {
  return {
    monthly_cap_usd: nullableNumber(draft.monthlyCapUsd),
    per_run_cap_usd: nullableNumber(draft.perRunCapUsd),
    measurement_cap_usd: nullableNumber(draft.measurementCapUsd),
    provider_spend_disabled: draft.providerSpendDisabled,
    notes: draft.notes.trim() || null
  };
}

function numberToInput(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(Number.isInteger(value) ? value : Number(value.toFixed(4)));
}

function nullableNumber(value: string) {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
}

function nullablePercent(value: string, fallback: number) {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) ? fallback : parsed / 100;
}

function JobControlRow({
  job,
  retryJob,
  cancelJob,
  busy
}: {
  job: StackCertJob & { project_name?: string };
  retryJob: (jobId: string) => void;
  cancelJob: (jobId: string) => void;
  busy: boolean;
}) {
  return (
    <div className="admin-job-row">
      <div>
        <div className="admin-row-title">
          <Badge tone={job.status}>{job.status}</Badge>
          <span>{job.project_name ?? job.project_id}</span>
        </div>
        <div className="mono muted admin-row-id">{job.id}</div>
        <p className="muted admin-row-copy">
          {job.dead_letter_reason
            ? `Dead letter: ${job.dead_letter_reason}`
            : job.retry_after
              ? `Retry after ${formatTime(job.retry_after)}`
              : job.error_class
                ? redactProviderError(job.error)
                : `${Math.round(job.progress * 100)}% complete`}
        </p>
      </div>
      <div className="admin-row-actions">
        {canRetry(job) ? (
          <button className="btn" disabled={busy} onClick={() => retryJob(job.id)}>
            Retry
          </button>
        ) : null}
        {canCancel(job) ? (
          <button className="btn" disabled={busy} onClick={() => cancelJob(job.id)}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function canRetry(job: StackCertJob) {
  return job.status === 'failed' || Boolean(job.dead_letter_reason) || (job.status === 'running' && Boolean(job.lease_expires_at) && isPast(String(job.lease_expires_at)));
}

function canCancel(job: StackCertJob) {
  return job.status === 'queued' || (job.status === 'running' && Boolean(job.lease_expires_at) && isPast(String(job.lease_expires_at)));
}

function clampNumber(value: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(Math.round(parsed), max));
}

function isPast(value: string) {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.getTime() <= Date.now();
}

function formatTime(value?: string | null) {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleString();
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? redactProviderError(error.message) : fallback;
}

function redactProviderError(value?: string | null) {
  if (!value) return 'No provider error details were returned.';
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/gi, 'sk-[redacted]')
    .slice(0, 420);
}
