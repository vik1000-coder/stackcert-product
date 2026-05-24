import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { Badge, Card, ErrorState, Explainer, ExternalButton, LoadingState, PageHeader } from '../components/Primitives';

export function CertificatePage({ lambda }: { lambda: number }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['certificate', lambda], queryFn: () => api.certificate(lambda) });
  const [acknowledged, setAcknowledged] = useState(false);
  const [signoffComment, setSignoffComment] = useState('');
  const issuedQuery = useQuery({
    queryKey: ['issued-certificate', query.data?.certificate_id],
    queryFn: () => api.issuedCertificate(query.data!.certificate_id),
    enabled: Boolean(query.data?.certificate_id)
  });
  const issueCertificate = useMutation({
    mutationFn: () => api.issueCertificate(lambda, { acknowledge_limitations: acknowledged, expires_in_days: 30 }),
    onSuccess: (data) => {
      queryClient.setQueryData(['issued-certificate', data.certificate.certificate_id], data);
    }
  });
  const issued = issuedQuery.data?.certificate ?? issueCertificate.data?.certificate ?? null;
  const createSignoff = useMutation({
    mutationFn: (decision: 'approved' | 'rejected' | 'requested_changes') =>
      api.createCertificateSignoff((issued?.certificate_id ?? query.data!.certificate_id), {
        signer_role: 'risk_reviewer',
        decision,
        comment: signoffComment || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issued-certificate', issued?.certificate_id ?? query.data?.certificate_id] });
      setSignoffComment('');
    }
  });

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const cert = query.data!;
  const evidencePreview = [
    '# StackCert Release Evidence',
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
    'Use this packet as release evidence, then retest if any trigger below changes.'
  ].join('\n');

  return (
    <div className="page">
      <PageHeader
        title="Release evidence"
        subtitle="This packet supports a decision about one LLM app, one example mix, and one set of safety options. It is not a universal safety guarantee."
        actions={
          <>
            <ExternalButton href={api.certificateMarkdownUrl(lambda)} variant="primary">
              Export evidence Markdown
            </ExternalButton>
            <ExternalButton href={api.certificateJsonUrl(lambda)}>Export evidence JSON</ExternalButton>
          </>
        }
      />
      <Explainer title="What this evidence packet means" tone="accent" style={{ marginBottom: 16 }}>
        <div className="definition-list">
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
          <div className="mono muted">Evidence ID {displayEvidenceId(cert.certificate_id)}</div>
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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Lock evidence for review</h2>
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
                I understand this evidence packet is scoped to the example mix, safety options, risk weighting, and
                assumptions shown here. It is not a guarantee of safety or compliance.
              </span>
            </label>
            <button className="btn primary" disabled={!acknowledged || issueCertificate.isPending} onClick={() => issueCertificate.mutate()}>
              {issueCertificate.isPending ? 'Issuing...' : 'Issue release evidence'}
            </button>
            {issueCertificate.isError ? (
              <div className="notice">{issueCertificate.error instanceof Error ? issueCertificate.error.message : 'Could not issue release evidence.'}</div>
            ) : null}
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            {issued ? (
              <>
                <Fact label="Issued" value={issued.issued_at} />
                <Fact label="Expires" value={issued.expires_at} />
                <Fact label="Artifact hash" value={issued.artifact_hash.slice(0, 24)} />
                <Fact label="Signoffs" value={String(issued.signoffs.length)} />
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No locked evidence snapshot yet.</p>
            )}
          </div>
        </div>
      </Card>
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
          <ul style={{ marginBottom: 0, paddingLeft: 18, color: 'var(--sc-ink-3)', lineHeight: 1.55 }}>
            {cert.recertification_triggers.map((item) => (
              <li key={item}>{displayScopeText(item)}</li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Evidence packet preview</h2>
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
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
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
    .replaceAll('certificate', 'evidence packet')
    .replaceAll('Certificate', 'Evidence packet')
    .replaceAll('Guardrail model', 'Safety option model')
    .replaceAll('guardrail model', 'safety option model')
    .replaceAll('benchmark mixture', 'example mix')
    .replaceAll('candidate set', 'safety-option set')
    .replaceAll('guard version', 'safety option version')
    .replaceAll('guard/model/prompt drift', 'safety option, model, or prompt drift')
    .replaceAll('re-certification', 'retesting');
}
