import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Card, ErrorState, Explainer, LoadingState, PageHeader, Stat } from '../components/Primitives';
import { api } from '../lib/api';
import { NoRunState, useStackCertApp } from '../lib/appContext';
import { fmtNumber, fmtUsd } from '../lib/format';

export function MeasurementsPage({ lambda }: { lambda: number }) {
  const { activeRunId, projectId, runsLoading } = useStackCertApp();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['measurements', activeRunId, lambda], queryFn: () => api.measurements(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const costs = useQuery({ queryKey: ['run-costs', activeRunId], queryFn: () => api.runCosts(activeRunId!), enabled: Boolean(activeRunId) });
  const overview = useQuery({ queryKey: ['overview', activeRunId, lambda], queryFn: () => api.overview(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [budgetCap, setBudgetCap] = useState('');
  const queuePlan = useMutation({
    mutationFn: () =>
      api.createMeasurementPlan(
        activeRunId!,
        {
          action_ids: selectedActions.map((action) => action.id),
          max_cost_usd: budgetCap.trim() ? Number(budgetCap) : undefined
        },
        lambda
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['run-costs'] });
    }
  });
  const runNextWorker = useMutation({
    mutationFn: () => api.runNextWorkerJob(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['run-costs'] });
    }
  });

  const actions = query.data?.actions ?? [];
  const effectiveSelected = selected ?? new Set(actions.map((action) => action.id));
  const selectedActions = useMemo(() => actions.filter((action) => effectiveSelected.has(action.id)), [actions, effectiveSelected]);
  const selectedCost = selectedActions.reduce((sum, action) => sum + action.cost_usd, 0);
  const radiusReduction = selectedActions.reduce((sum, action) => sum + action.expected_radius_reduction, 0);
  const eta = selectedActions.reduce((sum, action) => sum + action.eta_minutes, 0);

  const actualCost = costs.data?.summary.actual_cost_usd ?? 0;

  if (runsLoading && !activeRunId) return <LoadingState />;
  if (!activeRunId) return <NoRunState title="No test plan yet" />;
  if (query.isLoading || costs.isLoading || overview.isLoading) return <LoadingState />;
  if (query.error || costs.error || overview.error) return <ErrorState error={query.error || costs.error || overview.error} />;

  const overviewStats = overview.data!.stats;

  return (
    <div className="page">
      <PageHeader
        title="Test plan and cost"
        subtitle="Queue only the tests that can change which safety-check combination wins."
        actions={
          <>
            <button className="btn" onClick={() => setSelected(new Set(actions.map((action) => action.id)))}>
              Select all
            </button>
            <button className="btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <label className="btn" style={{ gap: 8 }}>
              <span>Cap</span>
              <input
                aria-label="Budget cap"
                className="mono"
                style={{ width: 86, border: 0, background: 'transparent', color: 'inherit', outline: 0 }}
                inputMode="decimal"
                placeholder={fmtUsd(selectedCost)}
                value={budgetCap}
                onChange={(event) => setBudgetCap(event.currentTarget.value)}
              />
            </label>
            <button className="btn primary" disabled={actions.length === 0 || selectedActions.length === 0 || queuePlan.isPending} onClick={() => queuePlan.mutate()}>
              {queuePlan.isPending ? 'Queueing...' : 'Queue selected tests'}
            </button>
            <button className="btn" disabled={runNextWorker.isPending} onClick={() => runNextWorker.mutate()}>
              {runNextWorker.isPending ? 'Working...' : 'Run worker'}
            </button>
            {queuePlan.isError ? <Badge tone="bad">Budget blocked</Badge> : null}
          </>
        }
      />
      <Explainer title="Where the cost savings happen" tone="accent" style={{ marginBottom: 16 }}>
        <p>
          Testing every combination and every overlap is expensive. StackCert has run{' '}
          <strong>{overviewStats.pair_cells_measured}/{overviewStats.pair_cells_total}</strong> useful overlap tests
          here, selecting only tests likely to change the recommendation and avoiding{' '}
          <strong>{fmtUsd(overviewStats.cost_avoided_usd)}</strong> of estimated testing spend.
        </p>
      </Explainer>
      <div className="grid grid-3">
        <Stat label="Selected test cost" value={fmtUsd(selectedCost)} description="Estimated spend for the currently checked test bundles." />
        <Stat label="Actual usage" value={fmtUsd(actualCost)} tone={actualCost > 0 ? 'ok' : undefined} description="Ledgered provider and worker cost from jobs that have run." />
        <Stat label="ETA" value={`${eta} min`} description="Projected runtime for the selected queue, useful for release planning." />
      </div>
      <Card style={{ marginTop: 16 }}>
        <div className="grid grid-4" style={{ gap: 12 }}>
          <MiniMetric label="Expected decision help" value={fmtNumber(radiusReduction, 5)} />
          <MiniMetric label="Provider calls" value={String(costs.data!.summary.request_count)} />
          <MiniMetric label="Input tokens" value={costs.data!.summary.input_tokens.toLocaleString()} />
          <MiniMetric label="Output tokens" value={costs.data!.summary.output_tokens.toLocaleString()} />
        </div>
        <p className="muted" style={{ margin: '14px 0 0', lineHeight: 1.5 }}>
          Expected decision help estimates how much a test can reduce uncertainty between close combinations. Bigger
          values are more likely to turn a close comparison into a clear recommendation.
        </p>
      </Card>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th />
              <th>Priority</th>
              <th>Test bundle</th>
              <th>Example group</th>
              <th>Side</th>
              <th className="right">Decision help</th>
              <th className="right">Cost</th>
              <th className="right">ETA</th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="notice" style={{ margin: 0 }}>
                    No additional targeted tests are recommended for this run. Review the recommendation and release
                    report; add more examples or safety-check outputs if the decision still feels under-scoped.
                  </div>
                </td>
              </tr>
            ) : null}
            {actions.map((action) => {
              const checked = effectiveSelected.has(action.id);
              return (
                <tr key={action.id}>
                  <td>
                    <input
                      aria-label={`Select ${action.label} ${action.cell_id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const next = new Set(effectiveSelected);
                        if (event.currentTarget.checked) next.add(action.id);
                        else next.delete(action.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="mono">{action.priority}</td>
                  <td className="mono">{action.label}</td>
                  <td className="mono">{action.cell_id}</td>
                  <td>
                    <Badge tone={action.side === 'adversarial' ? 'bad' : 'ok'}>{action.side}</Badge>
                  </td>
                  <td className="mono right">{fmtNumber(action.expected_radius_reduction, 5)}</td>
                  <td className="mono right">{fmtUsd(action.cost_usd)}</td>
                  <td className="mono right">{action.eta_minutes}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Card>
        {queuePlan.isSuccess ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>Test job queued</strong>
              <Badge tone={queuePlan.data.job.status}>{queuePlan.data.job.status}</Badge>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {String(queuePlan.data.job.summary.action_count)} action(s), {fmtUsd(Number(queuePlan.data.job.summary.selected_cost_usd ?? 0))} estimated cost,
              {` ${String(queuePlan.data.job.summary.selected_eta_minutes ?? 0)} min`} ETA.
            </p>
            <div className="mono" style={{ color: 'var(--sc-ink-3)', fontSize: 12 }}>{queuePlan.data.job.id}</div>
            {runNextWorker.isSuccess ? (
              <p className="muted" style={{ margin: 0 }}>
                Worker completed {runNextWorker.data.job.id}; actual usage is now reflected in the ledger.
              </p>
            ) : null}
          </div>
        ) : queuePlan.isError ? (
          <div className="notice bad">{queuePlan.error instanceof Error ? queuePlan.error.message : 'Could not queue test plan.'}</div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Production workers execute queued test plans asynchronously with team budget checks, provider rate
            limits, idempotent jobs, and audit events.
          </p>
        )}
      </Card>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Actual usage ledger</h2>
        {costs.data!.events.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Provider</th>
                  <th>Cell</th>
                  <th className="right">Calls</th>
                  <th className="right">Actual cost</th>
                </tr>
              </thead>
              <tbody>
                {costs.data!.events.slice(0, 8).map((event) => (
                  <tr key={event.id}>
                    <td>{event.operation.replace('_', ' ')}</td>
                    <td>{event.provider}</td>
                    <td className="mono">{String(event.metadata.cell_id ?? '-')}</td>
                    <td className="mono right">{event.request_count}</td>
                    <td className="mono right">{fmtUsd(event.actual_cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No actual usage yet. Queue a plan and run the worker to create usage events.</p>
        )}
      </Card>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{value}</div>
    </div>
  );
}
