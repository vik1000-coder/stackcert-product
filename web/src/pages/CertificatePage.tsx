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

  return (
    <div className="page">
      <PageHeader
        title="Scoped certificate"
        subtitle="This artifact supports a comparative risk decision. It does not guarantee the underlying AI system is safe, compliant, or free from harmful behavior."
        actions={
          <>
            <ExternalButton href={api.certificateMarkdownUrl(lambda)} variant="primary">
              Export Markdown
            </ExternalButton>
            <ExternalButton href={api.certificateJsonUrl(lambda)}>Export JSON</ExternalButton>
          </>
        }
      />
      <Explainer title="What the certificate means" tone="accent" style={{ marginBottom: 16 }}>
        <div className="definition-list">
          <div className="definition-row">
            <div className="definition-term">It proves</div>
            <div className="definition-copy">
              The selected stack beat the other candidate stacks for this benchmark mixture, guard set, aggregation
              rule, and welfare profile.
            </div>
          </div>
          <div className="definition-row">
            <div className="definition-term">It does not prove</div>
            <div className="definition-copy">
              Universal safety, legal compliance, or future performance after model, prompt, guard, or policy drift.
            </div>
          </div>
        </div>
      </Explainer>
      <div className="grid grid-2">
        <Card>
          <Badge tone={cert.status_compact} dot>
            {cert.status_compact}
          </Badge>
          <h2 style={{ margin: '14px 0 4px', fontSize: 28 }}>{cert.certified_label ?? cert.recommended_label}</h2>
          <div className="mono muted">{cert.certificate_id}</div>
          <div style={{ display: 'grid', gap: 9, marginTop: 18 }}>
            <Fact label="Run" value={cert.run_id} />
            <Fact label="Generated" value={cert.generated_at} />
            <Fact label="Recommended" value={cert.recommended_label} />
            <Fact label="Certified" value={cert.certified_label ?? 'not fully certified'} />
          </div>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Assumptions</h2>
          <p className="muted" style={{ marginTop: -4, lineHeight: 1.5 }}>
            These assumptions define the boundary of the claim reviewers are being asked to accept.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(cert.assumptions).map(([key, value]) => (
              <Fact key={key} label={key} value={String(value)} />
            ))}
          </div>
        </Card>
      </div>
      <Card style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Issue workflow</h2>
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
                I understand this certificate is scoped to the benchmark mixture, candidate set, guard versions, welfare profile,
                and assumptions shown here. It is not a guarantee of safety or compliance.
              </span>
            </label>
            <button className="btn primary" disabled={!acknowledged || issueCertificate.isPending} onClick={() => issueCertificate.mutate()}>
              {issueCertificate.isPending ? 'Issuing...' : 'Issue scoped certificate'}
            </button>
            {issueCertificate.isError ? (
              <div className="notice">{issueCertificate.error instanceof Error ? issueCertificate.error.message : 'Could not issue certificate.'}</div>
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
              <p className="muted" style={{ margin: 0 }}>No issued immutable snapshot yet.</p>
            )}
          </div>
        </div>
      </Card>
      <Card>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Risk reviewer signoff</h2>
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
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Recertification triggers</h2>
          <ul style={{ marginBottom: 0, paddingLeft: 18, color: 'var(--sc-ink-3)', lineHeight: 1.55 }}>
            {cert.recertification_triggers.map((item) => (
              <li key={item}>{item}</li>
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
          {cert.markdown}
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
