import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type EvidenceArtifactVerification } from '../lib/api';
import { NoRunState, useStackCertApp } from '../lib/appContext';
import { Badge, Card, ErrorState, Explainer, LoadingState, PageHeader } from '../components/Primitives';

export function CertificatePage({ lambda }: { lambda: number }) {
  const { projectId, activeRunId, runsLoading, runs } = useStackCertApp();
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
  const [selectedReportVersionId, setSelectedReportVersionId] = useState('');
  const activeRun = runs.find((run) => run.id === activeRunId);
  const permissions = useQuery({ queryKey: ['project-permissions', projectId], queryFn: () => api.projectPermissions(projectId) });
  const reportVersions = useQuery({
    queryKey: ['report-versions', activeRunId, lambda],
    queryFn: () => api.reportVersions(activeRunId!, lambda),
    enabled: Boolean(activeRunId)
  });
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
  const exportReport = useMutation({
    mutationFn: (format: 'markdown' | 'json' | 'pdf') => api.exportReport(selectedReportVersionId || issued?.certificate_id || activeRunId!, format, lambda),
    onSuccess: (data) => downloadReportExport(data.export)
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
  const caps = permissions.data?.permissions.capabilities ?? {};
  const canIssue = caps.issue_report !== false;
  const canSignoff = caps.signoff_report !== false;
  const canExport = caps.export_report !== false;
  const evidencePreview = [
    '# StackCert Release Report',
    '',
    `Selected combination: ${cert.certified_label ?? cert.recommended_label}`,
    `Recommended combination: ${cert.recommended_label}`,
    `Generated: ${cert.generated_at}`,
    '',
    'What this supports:',
    'The selected safety-check combination beat the other combinations tested for this app, example mix, release goal weighting, and assumptions.',
    '',
    'What this does not prove:',
    'It does not guarantee universal safety, legal compliance, or future behavior after model, prompt, safety option, tool, traffic, or policy changes.',
    '',
    'Reviewer action:',
    'Use this report in release review, then retest if any trigger below changes.'
  ].join('\n');

  return (
    <div className="page">
      <PageHeader
        title="Release report"
        subtitle="This report supports a decision about one LLM app, one example mix, and one set of safety options. It is not a universal safety guarantee."
      />
      {activeRun?.source === 'template_seeded' ? (
        <Explainer title="Template evidence" tone="warn" style={{ marginBottom: 16 }}>
          <p>
            This report is based on duplicated sample fixture data. It is safe for walkthroughs, but replace the
            examples and safety-check outputs before treating any export as private buyer release evidence.
          </p>
        </Explainer>
      ) : null}
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
              The selected safety-check combination beat the other combinations for this app, example mix, release
              goal weighting, and release assumptions.
            </div>
          </div>
          <div className="definition-row">
            <div className="definition-term">It does not prove</div>
            <div className="definition-copy">
              Universal safety, legal compliance, or future performance after model, prompt, safety option, or policy drift.
            </div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Targeted tests</div>
            <div className="definition-copy">
              Extra checks StackCert runs only when they can change the recommendation or the report boundary.
            </div>
          </div>
          <div className="definition-row">
            <div className="definition-term">Retest boundary</div>
            <div className="definition-copy">
              Model, prompt, policy, tool, retrieval, or traffic changes that require a fresh release report.
            </div>
          </div>
        </div>
      </Explainer>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card>
          <div className="stat-label">Decision</div>
          <div style={{ marginTop: 10 }}>
            <Badge tone={cert.status_compact} dot>
              {displayEvidenceStatus(cert.status_compact)}
            </Badge>
          </div>
          <p className="muted" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>
            Use this as a release-review artifact for the selected app scope, not as a general guarantee.
          </p>
        </Card>
        <Card>
          <div className="stat-label">Selected combination</div>
          <h2 style={{ margin: '10px 0 0', fontSize: 20 }}>{cert.certified_label ?? cert.recommended_label}</h2>
          <p className="muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
            Recommended combination: {cert.recommended_label}.
          </p>
        </Card>
        <Card>
          <div className="stat-label">Reviewer action</div>
          <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            Confirm the assumptions, limitations, output coverage, and signoff owner before locking the report.
          </p>
        </Card>
        <Card>
          <div className="stat-label">Agent hooks</div>
          <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            CI gates, webhooks, MCP resources, and agent workflow reviews should read the report status and retest
            triggers before acting.
          </p>
        </Card>
      </div>
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
              <AssumptionFact key={key} label={displayAssumptionLabel(key)} value={value} />
            ))}
          </div>
        </Card>
      </div>
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Readiness to lock</h2>
            <p className="muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
              StackCert checks that the run is complete, outputs cover the current example mix, and the recommendation
              is within the report scope.
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
              <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{displayScopeText(check.message)}</p>
            </div>
          ))}
          {readinessQuery.isLoading ? <p className="muted" style={{ margin: 0 }}>Checking report readiness...</p> : null}
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
                I understand this release report is scoped to the example mix, safety options, release goal weighting, and
                assumptions shown here. It is not a guarantee of safety or compliance.
              </span>
            </label>
            <button
              className="btn primary"
              disabled={!canIssue || Boolean(issued) || !acknowledged || readiness?.can_issue === false || issueCertificate.isPending}
              onClick={() => issueCertificate.mutate()}
            >
              {issued ? 'Release report issued' : issueCertificate.isPending ? 'Issuing...' : 'Issue release report'}
            </button>
            {!canIssue ? <p className="muted" style={{ margin: 0 }}>Your role can inspect this report, but cannot issue it.</p> : null}
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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Export release report</h2>
        <p className="muted" style={{ marginTop: -4, lineHeight: 1.5 }}>
          Export the current report artifact for reviewer packets. Issued reports export the locked version; draft exports remain tied to the current run.
        </p>
        <div className="notice" style={{ marginBottom: 12 }}>
          <strong>Report versions</strong>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <label>
              <span className="muted">Export target</span>
              <select className="btn" value={selectedReportVersionId} onChange={(event) => setSelectedReportVersionId(event.currentTarget.value)}>
                <option value="">Latest report for this run</option>
                {(reportVersions.data?.report_versions ?? []).map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.version} · {version.content_hash.slice(0, 10)} · {version.created_at}
                  </option>
                ))}
              </select>
            </label>
            {reportVersions.data?.report_versions.length ? (
              <span className="muted">{reportVersions.data.report_versions.length} immutable report version(s) available.</span>
            ) : (
              <span className="muted">The first export creates the initial immutable report version.</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['markdown', 'json', 'pdf'] as const).map((format) => (
            <button
              key={format}
              className={format === 'pdf' ? 'btn primary' : 'btn'}
              disabled={!canExport || exportReport.isPending}
              onClick={() => exportReport.mutate(format)}
            >
              Export {format.toUpperCase()}
            </button>
          ))}
        </div>
        {!canExport ? <p className="muted">Your role cannot export report artifacts.</p> : null}
        {exportReport.data ? (
          <div className="notice" style={{ marginTop: 12 }}>
            Exported version {exportReport.data.export.version} as {exportReport.data.export.filename}.
          </div>
        ) : null}
        {exportReport.isError ? (
          <div className="notice" style={{ marginTop: 12 }}>
            {exportReport.error instanceof Error ? exportReport.error.message : 'Could not export report.'}
          </div>
        ) : null}
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
            disabled={!issued || !canSignoff}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" disabled={!issued || !canSignoff || createSignoff.isPending} onClick={() => createSignoff.mutate('approved')}>
              Approve
            </button>
            <button className="btn" disabled={!issued || !canSignoff || createSignoff.isPending} onClick={() => createSignoff.mutate('requested_changes')}>
              Request changes
            </button>
            <button className="btn" disabled={!issued || !canSignoff || createSignoff.isPending} onClick={() => createSignoff.mutate('rejected')}>
              Reject
            </button>
          </div>
          {!canSignoff ? <p className="muted" style={{ margin: 0 }}>Signoff requires Reviewer, Editor, or Admin permissions.</p> : null}
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

function downloadReportExport(exported: { filename: string; content: string; content_type: string; encoding: 'utf-8' | 'base64' }) {
  const bytes =
    exported.encoding === 'base64'
      ? Uint8Array.from(window.atob(exported.content), (char) => char.charCodeAt(0))
      : exported.content;
  const blob = new Blob([bytes], { type: exported.content_type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exported.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 150px) minmax(0, 1fr)', gap: 12, fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span className="mono" style={{ overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
}

function AssumptionFact({ label, value }: { label: string; value: unknown }) {
  if (isRecord(value)) {
    return (
      <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
        <span className="muted">{label}</span>
        <div className="definition-list" style={{ padding: 10, border: '1px solid var(--sc-line)', borderRadius: 8 }}>
          {Object.entries(value).map(([key, nestedValue]) => (
            <div key={key} className="definition-row">
              <div className="definition-term">{displayAssumptionLabel(key)}</div>
              <div className="definition-copy mono">{displayAssumptionValue(nestedValue)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <Fact label={label} value={displayAssumptionValue(value)} />;
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
      copy: 'The report applies to the tested instructions and policy expectations; changed instructions need fresh output coverage.'
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
    copy: 'Treat this as a boundary change and retest before using the report in release review.'
  };
}

function displayReadinessStatus(status?: string) {
  if (status === 'ready') return 'ready';
  if (status === 'warning') return 'can lock with warnings';
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
  if (value === 'issued_evidence_json') return 'Report JSON';
  if (value === 'issued_evidence_markdown') return 'Report Markdown';
  return value.replaceAll('_', ' ');
}

function displayAssumptionLabel(label: string) {
  const labels: Record<string, string> = {
    aggregation: 'Combination rule',
    max_k: 'Max checks',
    rho_prior: 'Overlap prior',
    use_feasible_bounds: 'Use feasible bounds',
    residual_treatment: 'Residual handling',
    certificate_scope: 'Report scope'
  };
  return labels[label] ?? label.replaceAll('_', ' ');
}

function displayAssumptionValue(value: unknown): string {
  if (value === 'finite benchmark mixture') return 'finite example mix';
  if (value === null || value === undefined) return 'not set';
  if (Array.isArray(value)) return value.map(displayAssumptionValue).join(', ');
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${displayAssumptionLabel(key)}: ${displayAssumptionValue(nestedValue)}`)
      .join('; ');
  }
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function displayEvidenceStatus(status: string) {
  if (status === 'valid') return 'ready for review';
  if (status === 'certified') return 'ready for review';
  if (status === 'open') return 'needs more test output';
  if (status === 'negative') return 'not recommended';
  return status;
}

function displayEvidenceId(value: string) {
  return value.replace(/^cert/i, 'report');
}

function displayScopeText(text: string) {
  return text
    .replaceAll('K=2 serial stack certificates', 'two-check combination report')
    .replaceAll('certificate', 'release report')
    .replaceAll('Certificate', 'Release report')
    .replaceAll('Guardrail model', 'Safety option model')
    .replaceAll('guardrail model', 'safety option model')
    .replaceAll('CASS found', 'StackCert found')
    .replaceAll('benchmark suite', 'example suite')
    .replaceAll('a example', 'an example')
    .replaceAll('benchmark mixture', 'example mix')
    .replaceAll('targeted measurement actions', 'targeted tests')
    .replaceAll('Issuer acknowledgement', 'Reviewer acknowledgement')
    .replaceAll('candidate set', 'safety-option set')
    .replaceAll('guard version', 'safety option version')
    .replaceAll('Traffic mixture', 'Traffic mix')
    .replaceAll('benchmark weights', 'example weights')
    .replaceAll('guard/model/prompt drift', 'safety option, model, or prompt drift')
    .replaceAll('recertification', 'retesting')
    .replaceAll('re-certification', 'retesting');
}
