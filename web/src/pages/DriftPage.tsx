import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useStackCertApp } from '../lib/appContext';
import { Badge, Card, ErrorState, LoadingState, PageHeader } from '../components/Primitives';

export function DriftPage({ lambda }: { lambda: number }) {
  const { projectId } = useStackCertApp();
  const query = useQuery({ queryKey: ['drift', projectId, lambda], queryFn: () => api.drift(projectId, lambda) });
  const triggerRetest = useMutation({ mutationFn: () => api.triggerRecertification(projectId, lambda) });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const data = query.data!;

  return (
    <div className="page">
      <PageHeader
        title="When to retest"
        subtitle="A release report stays useful only while the example mix, safety options, model versions, prompts, tools, and traffic assumptions stay in scope."
        actions={
          <button className="btn primary" disabled={triggerRetest.isPending} onClick={() => triggerRetest.mutate()}>
            {triggerRetest.isPending ? 'Queueing retest...' : 'Trigger retest'}
          </button>
        }
      />
      {triggerRetest.isSuccess ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          <strong>Retest queued</strong>
          <div className="muted" style={{ marginTop: 5 }}>{triggerRetest.data.message}</div>
          <div className="mono" style={{ marginTop: 8, color: 'var(--sc-ink-3)', fontSize: 12 }}>{triggerRetest.data.job_id}</div>
        </div>
      ) : null}
      {triggerRetest.isError ? (
        <div className="notice bad" style={{ marginBottom: 16 }}>
          {triggerRetest.error instanceof Error ? triggerRetest.error.message : 'Could not queue retest.'}
        </div>
      ) : null}
      <div className="grid grid-3">
        {data.signals.map((signal) => (
          <Card key={signal.id}>
            <Badge tone={signal.severity} dot>
              {signal.severity}
            </Badge>
            <h2 style={{ margin: '14px 0 8px', fontSize: 18 }}>{signal.title}</h2>
            <p className="muted" style={{ lineHeight: 1.55 }}>{signal.description}</p>
            <div className="mono" style={{ color: 'var(--sc-ink-3)', fontSize: 12 }}>
              {signal.kind} · {signal.status}
            </div>
          </Card>
        ))}
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Retest</th>
              <th>Status</th>
              <th>Run</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id}</td>
                <td>
                  <Badge tone={row.status}>{row.status}</Badge>
                </td>
                <td className="mono">{row.run_id}</td>
                <td className="muted">{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <p className="muted" style={{ margin: 0 }}>
          Agent-ready integrations can turn MCP resources, deployment webhooks, release-gate decisions, safety-option
          version changes, prompt diffs, model releases, and incident reports into retest signals for human review.
        </p>
      </Card>
    </div>
  );
}
