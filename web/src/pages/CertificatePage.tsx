import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type EvidenceArtifactVerification } from '../lib/api';
import { NoRunState, useStackCertApp } from '../lib/appContext';
import { Badge, Card, ErrorState, Explainer, LoadingState, PageHeader } from '../components/Primitives';

export function CertificatePage({ lambda }: { lambda: number }) {
  const { activeRunId, runsLoading } = useStackCertApp();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['certificate', activeRunId, lambda], queryFn: () => api.certificate(activeRunId!, lambda), enabled: Boolean(activeRunId) });
  const readinessQuery = useQuery({
    queryKey: ['certificate-readiness', activeRunId, lambda],
    queryFn: () => api.certificateReadiness(activeRunId!, lambda),
    enabled: Boolean(activeRunId)
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [signoffComment, setSignoffComment] = useState('');
  const [artifactVerification, setArtifactVerification] = useState<EvidenceArtifactVerification | null>(null);
  const issuedQuery = useQuery({
    queryKey: ['issued-certificate-for-run', activeRunId, lambda],
    queryFn: () => api.issuedCertificateForRun(activeRunId!, lambda),
    enabled: Boolean(activeRunId)
  });
  const issueCertificate = useMutation({
    mutationFn: () => api.issueCertificate(activeRunId!, lambda, { acknowledge_limitations: acknowledged, expires_in_days: 30 }),
    onSuccess: (data) => {
      queryClient.setQueryData(['issued-certificate-for-run', activeRunId, lambda], data);
    }
  });
  const issued = issuedQuery.data?.certificate ?? issueCertificate.data?.certificate ?? null;
  const artifacts = issued?.artifacts ?? issued?.artifact_refs ?? [];
  const readiness = readinessQuery.data?.readiness ?? null;
  const artifactUrlMutation = useMutation({
    mutationFn: (artifactType: string) => api.certificateArtifactSignedUrl(issued!.certificate_id, artifactType),
    onSuccess: (data) => {
      window.location.assign(data.artifact.signed_url);
    }
  });
  const artifactVerifyMutation = useMutation({
    mutationFn: (artifactType: string) => api.verifyCertificateArtifact(issued!.certificate_id, artifactType),
    onSuccess: (data) => setArtifactVerification(data.verification)
  });
  const createSignoff = useMutation({
    mutationFn: (decision: 'approved' | 'rejected' | 'requested_changes') =>
      api.createCertificateSignoff((issued?.certificate_id ?? query.data!.certificate_id), {
        signer_role: 'risk_reviewer',
        decision,
        comment: signoffComment || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issued-certificate-for-run', activeRunId, lambda] });
      setSignoffComment('');
    }
  });

  if (runsLoading && !activeRunId) return <LoadingState />;
  if (!activeRunId) return <NoRunState title="No release report yet" />;
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const cert = query.data!;
  const evidencePreview = [
    '# StackCert Release Evidence Report',
    '',
    `Selected combination: ${cert.certified_label ?? cert.recommended_label}`,
    `Recommended combination: ${cert.recommended_label}`,
    `Generated: ${cert.generated_at}`,
    '',
    'What this supports:',
    'The selected safety-check combination beat the other combinations tested for this app, example mix, risk weighting, and assumptions.',
    '',
    'What this does not prove:',
    'It does not guarantee universal safety, legal compliance, or future behavior after model, prompt, safety option, tool, traffic, or policy changes.',
    '',
    'Reviewer action:',
    'Use this report as release evidence, then retest if any trigger below changes.'
  ].join('\n');

  return (
    <div className="page">
      <PageHeader
        title="Release report"
        subtitle="This report supports a decision about one LLM app, one example mix, and one set of safety options. It is not a universal safety guarantee."
      />
      <Explainer title="What this release report means" tone="accent" style={{ marginBottom: 16 }}>
        <div className="definition-list">
          <div className="definition-row">
            <div className="definition-term">It is</div>
            <div className="definition-copy">
              A locked review record: the tested examples, candidate safety-check combinations, recommendation, cost
              assumptions, limitations, and retest triggers.
            </div>
          </div>
          <div className="definition-row">
            <div className="definition-term">It supports</div>
            <div className="definition-copy">
              The selected safety-check combination beat the other combinations for this app, example mix, risk
              weighting, and release assumptions.
            </div>
          </div>
          <div className="definition-row">
            <div className="definition-term">It does not prove</div>
            <div className="definition-copy">
              Universal safety, legal compliance, or future performance after model, prompt, safety option, or policy drift.
            </div>
          </div>
        </div>
      </Explainer>
      <div className="grid grid-2">
        <Card>
          <Badge tone={cert.status_compact} dot>
            {displayEvidenceStatus(cert.status_compact)}
          </Badge>
          <h2 style={{ margin: '14px 0 4px', fontSize: 28 }}>{cert.certified_label ?? cert.recommended_label}</h2>
          <div className="mono muted">Report ID {displayEvidenceId(cert.certificate_id)}</div>
          <div style={{ display: 'grid', gap: 9, marginTop: 18 }}>
            <Fact label="Test run" value={cert.run_id} />
            <Fact label="Generated" value={cert.generated_at} />
            <Fact label="Recommended" value={cert.recommended_label} />
            <Fact label="Selected" value={cert.certified_label ?? 'no final selection yet'} />
          </div>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Assumptions</h2>
          <p className="muted" style={{ marginTop: -4, lineHeight: 1.5 }}>
            These assumptions define the boundary of the claim reviewers are being asked to accept.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(cert.assumptions).map(([key, value]) => (
              <Fact key={key} label={displayAssumptionLabel(key)} value={displayAssumptionValue(String(value))} />
            ))}
          </div>
        </Card>
      </div>
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Readiness to issue</h2>
            <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
              StackCert checks that the run is complete, outputs cover the current example mix, and the CASS result is
              within the report scope.
            </p>
          </div>
          <Badge tone={readinessTone(readiness?.status)} dot>
            {displayReadinessStatus(readiness?.status)}
          </Badge>
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {(readiness?.checks ?? []).map((check) => (
            <div
              key={check.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(130px, 180px) minmax(0, 1fr)',
                gap: 12,
                borderTop: '1px solid var(--sc-line)',
                paddingTop: 10
              }}
            >
              <div>
                <Badge tone={check.status}>{check.status}</Badge>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{check.label}</div>
              </div>
              <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{check.message}</p>
            </div>
          ))}
          {readinessQuery.isLoading ? <p className="muted" style={{ margin: 0 }}>Checking evidence readiness...</p> : null}
          {readiness?.blockers.length ? (
            <ReadinessList title="Blocking reasons" items={readiness.blockers} tone="bad" />
          ) : null}
          {readiness?.warnings.length ? (
            <ReadinessList title="Warnings" items={readiness.warnings} tone="warn" />
          ) : null}
        </div>
      </Card>
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Lock report for review</h2>
            <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
              Issuing creates an immutable release-report snapshot and private artifacts for reviewers.
            </p>
          </div>
          {issued ? <Badge tone="ok" dot>immutable report issued</Badge> : <Badge tone="neutral">not issued</Badge>}
        </div>
        <div className="grid grid-2">
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'start', color: 'var(--sc-ink-3)', lineHeight: 1.45 }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.currentTarget.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                I understand this release report is scoped to the example mix, safety options, risk weighting, and
                assumptions shown here. It is not a guarantee of safety or compliance.
              </span>
            </label>
            <button
              className="btn primary"
              disabled={!acknowledged || readiness?.can_issue === false || issueCertificate.isPending}
              onClick={() => issueCertificate.mutate()}
            >
              {issueCertificate.isPending ? 'Issuing...' : 'Issue release report'}
            </button>
            {issueCertificate.isError ? (
              <div className="notice">{issueCertificate.error instanceof Error ? issueCertificate.error.message : 'Could not issue release report.'}</div>
            ) : null}
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            {issued ? (
              <>
                <Fact label="Issued" value={issued.issued_at} />
                <Fact label="Expires" value={issued.expires_at} />
                <Fact label="Packet hash" value={issued.artifact_hash} />
                <Fact label="Artifacts" value={String(artifacts.length)} />
                <Fact label="Signoffs" value={String(issued.signoffs.length)} />
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No locked release report yet.</p>
            )}
          </div>
        </div>
      </Card>
      {issued ? (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Private report artifacts</h2>
          <p className="muted" style={{ marginTop: -4, lineHeight: 1.5 }}>
            Locked reports are stored as private artifacts. Download links are short-lived and every verification
            recomputes the stored SHA-256.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {artifacts.map((artifact) => (
              <div
                key={`${artifact.bucket}/${artifact.object_path}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 12,
                  alignItems: 'center',
                  borderTop: '1px solid var(--sc-line)',
                  paddingTop: 10
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge tone="ok">{displayArtifactType(artifact.artifact_type)}</Badge>
                    <span className="mono muted">{Math.ceil(artifact.byte_size / 1024)} KB</span>
                  </div>
                  <div className="mono" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>{artifact.sha256}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    className="btn"
                    disabled={artifactVerifyMutation.isPending}
                    onClick={() => artifactVerifyMutation.mutate(artifact.artifact_type)}
                  >
                    Verify hash
                  </button>
                  <button
                    className="btn primary"
                    disabled={artifactUrlMutation.isPending}
                    onClick={() => artifactUrlMutation.mutate(artifact.artifact_type)}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
            {!artifacts.length ? <p className="muted" style={{ margin: 0 }}>No private artifacts are attached yet.</p> : null}
            {artifacts.length ? (
              <div className="notice">
                <strong>Export history</strong>
                <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                  {artifacts.map((artifact) => (
                    <div key={`history-${artifact.artifact_type}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span>{displayArtifactType(artifact.artifact_type)}</span>
                      <span className="mono">{artifact.sha256.slice(0, 16)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {artifactVerification ? (
              <div className="notice">
                {artifactVerification.verified ? 'Hash verified' : 'Hash mismatch'} for {displayArtifactType(artifactVerification.artifact_type)}.
              </div>
            ) : null}
            {artifactUrlMutation.isError ? (
              <div className="notice">{artifactUrlMutation.error instanceof Error ? artifactUrlMutation.error.message : 'Could not create download URL.'}</div>
            ) : null}
            {artifactVerifyMutation.isError ? (
              <div className="notice">{artifactVerifyMutation.error instanceof Error ? artifactVerifyMutation.error.message : 'Could not verify artifact.'}</div>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Reviewer signoff</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <textarea
            className="btn"
            style={{ minHeight: 84, justifyContent: 'flex-start', alignItems: 'flex-start', resize: 'vertical' }}
            placeholder="Review comment"
            value={signoffComment}
            onChange={(event) => setSignoffComment(event.currentTarget.value)}
            disabled={!issued}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" disabled={!issued || createSignoff.isPending} onClick={() => createSignoff.mutate('approved')}>
              Approve
            </button>
            <button className="btn" disabled={!issued || createSignoff.isPending} onClick={() => createSignoff.mutate('requested_changes')}>
              Request changes
            </button>
            <button className="btn" disabled={!issued || createSignoff.isPending} onClick={() => createSignoff.mutate('rejected')}>
              Reject
            </button>
          </div>
          {issued?.signoffs.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {issued.signoffs.map((signoff) => (
                <div key={signoff.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--sc-line)', paddingTop: 10 }}>
                  <div>
                    <Badge tone={signoff.decision}>{signoff.decision.replace('_', ' ')}</Badge>
                    <p className="muted" style={{ margin: '6px 0 0' }}>{signoff.comment || 'No comment'}</p>
                  </div>
                  <span className="mono muted">{signoff.signer_role}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Limitations</h2>
          <ul style={{ marginBottom: 0, paddingLeft: 18, color: 'var(--sc-ink-3)', lineHeight: 1.55 }}>
            {cert.limitations.map((item) => (
              <li key={item}>{displayScopeText(item)}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Retest triggers</h2>
          <ul style={{ marginBottom: 14, paddingLeft: 18, color: 'var(--sc-ink-3)', lineHeight: 1.55 }}>
            {cert.recertification_triggers.map((item) => (
              <li key={item}>{displayScopeText(item)}</li>
            ))}
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            {cert.recertification_triggers.slice(0, 4).map((item) => (
              <RetestTrigger key={`trigger-${item}`} trigger={item} />
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Release report preview</h2>
        <pre
          className="mono"
          style={{
            maxHeight: 420,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            border: '1px solid var(--sc-line)',
            borderRadius: 8,
            background: 'var(--sc-surface-2)',
            padding: 16,
            fontSize: 12,
            lineHeight: 1.6
          }}
        >
          {evidencePreview}
        </pre>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 150px) minmax(0, 1fr)', gap: 12, fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span className="mono" style={{ overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
}

function ReadinessList({
  title,
  items,
  tone
}: {
  title: string;
  items: Array<{ code: string; message: string }>;
  tone: 'bad' | 'warn';
}) {
  return (
    <div className="notice">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <Badge tone={tone}>{title}</Badge>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((item) => (
          <li key={item.code}>{item.message}</li>
        ))}
      </ul>
    </div>
  );
}

function RetestTrigger({ trigger }: { trigger: string }) {
  const explanation = explainRetestTrigger(trigger);
  return (
    <div style={{ borderTop: '1px solid var(--sc-line)', paddingTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge tone={explanation.tone}>{explanation.label}</Badge>
        <span className="mono muted" style={{ fontSize: 11 }}>{trigger}</span>
      </div>
      <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{explanation.copy}</p>
    </div>
  );
}

function explainRetestTrigger(trigger: string) {
  const normalized = trigger.toLowerCase();
  if (normalized.includes('model')) {
    return {
      label: 'Model change',
      tone: 'warn',
      copy: 'A different model can shift refusal, helpfulness, and tool-use behavior even when prompts and safety checks stay fixed.'
    };
  }
  if (normalized.includes('prompt') || normalized.includes('policy')) {
    return {
      label: 'Prompt or policy change',
      tone: 'warn',
      copy: 'The evidence applies to the tested instructions and policy expectations; changed instructions need fresh output coverage.'
    };
  }
  if (normalized.includes('traffic') || normalized.includes('benchmark') || normalized.includes('example')) {
    return {
      label: 'Example mix change',
      tone: 'warn',
      copy: 'StackCert ranks combinations for the weighted example mix. New user behavior or risk categories can change the winner.'
    };
  }
  if (normalized.includes('guard') || normalized.includes('safety')) {
    return {
      label: 'Safety option change',
      tone: 'warn',
      copy: 'A new endpoint, threshold, classifier, or judge prompt changes both cost and joint behavior with the other checks.'
    };
  }
  return {
    label: 'Scope change',
    tone: 'neutral',
    copy: 'Treat this as a boundary change and retest before using the report as release evidence.'
  };
}

function displayReadinessStatus(status?: string) {
  if (status === 'ready') return 'ready';
  if (status === 'warning') return 'can issue with warnings';
  if (status === 'blocked') return 'blocked';
  return 'checking';
}

function readinessTone(status?: string) {
  if (status === 'ready') return 'ok';
  if (status === 'warning') return 'warn';
  if (status === 'blocked') return 'bad';
  return 'neutral';
}

function displayArtifactType(value: string) {
  if (value === 'issued_evidence_json') return 'Issued JSON';
  if (value === 'issued_evidence_markdown') return 'Issued Markdown';
  return value.replaceAll('_', ' ');
}

function displayAssumptionLabel(label: string) {
  const labels: Record<string, string> = {
    aggregation: 'Combination rule',
    max_k: 'Max checks',
    rho_prior: 'Overlap prior',
    use_feasible_bounds: 'Use feasible bounds',
    residual_treatment: 'Residual handling',
    certificate_scope: 'Evidence scope'
  };
  return labels[label] ?? label.replaceAll('_', ' ');
}

function displayAssumptionValue(value: string) {
  if (value === 'finite benchmark mixture') return 'finite example mix';
  return value;
}

function displayEvidenceStatus(status: string) {
  if (status === 'valid') return 'ready for review';
  if (status === 'certified') return 'ready for review';
  if (status === 'open') return 'needs more evidence';
  if (status === 'negative') return 'not recommended';
  return status;
}

function displayEvidenceId(value: string) {
  return value.replace(/^cert/i, 'evidence');
}

function displayScopeText(text: string) {
  return text
    .replaceAll('K=2 serial stack certificates', 'two-check combination evidence')
    .replaceAll('certificate', 'release report')
    .replaceAll('Certificate', 'Release report')
    .replaceAll('Guardrail model', 'Safety option model')
    .replaceAll('guardrail model', 'safety option model')
    .replaceAll('benchmark mixture', 'example mix')
    .replaceAll('candidate set', 'safety-option set')
    .replaceAll('guard version', 'safety option version')
    .replaceAll('guard/model/prompt drift', 'safety option, model, or prompt drift')
    .replaceAll('re-certification', 'retesting');
}
