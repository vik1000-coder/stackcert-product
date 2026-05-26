import { Badge, ButtonLink, Card } from './Primitives';
import type { PilotReadinessPayload, PilotReadinessStage } from '../lib/api';

export function PilotReadinessPanel({ readiness, compact = false }: { readiness: PilotReadinessPayload; compact?: boolean }) {
  const next = readiness.next_step;
  const stageRows = compact ? readiness.stages.filter((stage) => stage.status !== 'complete').slice(0, 3) : readiness.stages;
  return (
    <Card style={{ marginBottom: 16 }}>
      <div className="pilot-readiness-head">
        <div>
          <div className="stat-label">Pilot path</div>
          <h2 className="pilot-readiness-title">First useful release report</h2>
          <p className="muted pilot-readiness-copy">
            {readiness.summary.project_name} is {readiness.progress.completed}/{readiness.progress.total} steps through setup.
            Next: {next.label.toLowerCase()}.
          </p>
        </div>
        <div className="pilot-readiness-progress" aria-label="Pilot setup progress">
          <span className="mono">{Math.round(readiness.progress.percent * 100)}%</span>
          <div className="progress-track">
            <span style={{ width: `${Math.round(readiness.progress.percent * 100)}%` }} />
          </div>
          <ButtonLink to={readinessRoute(next.action_href)} variant="primary">
            {next.action_label}
          </ButtonLink>
        </div>
      </div>

      <div className="pilot-readiness-grid">
        <div className="pilot-step-list">
          {stageRows.map((stage) => (
            <PilotStageRow key={stage.id} stage={stage} />
          ))}
        </div>
        <div className="pilot-boundary">
          <Badge tone="warn">Scoped report</Badge>
          <p>{readiness.trust_boundary.plain_language}</p>
          <div className="pilot-boundary-list">
            <span>Retest on model, prompt, policy, tool, retrieval, or traffic changes.</span>
            <span>Use release gates to check the report status and context before deploy.</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PilotStageRow({ stage }: { stage: PilotReadinessStage }) {
  return (
    <div className={`pilot-step-row ${stage.status}`}>
      <div className="pilot-step-marker" aria-hidden="true" />
      <div style={{ minWidth: 0 }}>
        <div className="pilot-step-title">
          <strong>{stage.label}</strong>
          <Badge tone={stageTone(stage.status)}>{stageLabel(stage.status)}</Badge>
        </div>
        <p className="muted">{stage.description}</p>
        {stage.blockers.length ? <p className="pilot-step-blocker">{stage.blockers[0]}</p> : null}
      </div>
    </div>
  );
}

function readinessRoute(actionHref: string) {
  if (actionHref.startsWith('/')) return actionHref;
  return `../${actionHref}`;
}

function stageTone(status: string) {
  if (status === 'complete') return 'ok';
  if (status === 'active') return 'warn';
  if (status === 'blocked') return 'bad';
  return 'neutral';
}

function stageLabel(status: string) {
  if (status === 'complete') return 'done';
  if (status === 'active') return 'next';
  if (status === 'blocked') return 'blocked';
  return status;
}
