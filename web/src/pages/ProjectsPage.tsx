import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { api, type ProjectInput, type WorkspaceInput } from '../lib/api';
import { Badge, Card, ErrorState, LoadingState, PageHeader } from '../components/Primitives';

const initialWorkspace: WorkspaceInput = {
  name: 'Design Partner Lab',
  slug: 'design-partner-lab',
  plan: 'team'
};

const initialProject: Omit<ProjectInput, 'workspace_id'> = {
  name: 'Support Agent Pilot',
  slug: 'support-agent-pilot',
  environment: 'production',
  risk_tier: 'high',
  data_mode: 'redacted_snippets',
  description: 'Customer-facing support agent pilot.'
};

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const workspaces = useQuery({ queryKey: ['workspaces'], queryFn: api.workspaces });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceInput>(initialWorkspace);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('ws_demo');
  const [projectDraft, setProjectDraft] = useState(initialProject);

  const createWorkspace = useMutation({
    mutationFn: api.createWorkspace,
    onSuccess: (data) => {
      setSelectedWorkspaceId(data.workspace.id);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    }
  });
  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const workspaceOptions = useMemo(() => workspaces.data?.workspaces ?? [], [workspaces.data]);

  function submitWorkspace(event: FormEvent) {
    event.preventDefault();
    createWorkspace.mutate(workspaceDraft);
  }

  function submitProject(event: FormEvent) {
    event.preventDefault();
    createProject.mutate({ workspace_id: selectedWorkspaceId, ...projectDraft });
  }

  if (workspaces.isLoading || projects.isLoading) return <LoadingState />;
  if (workspaces.error || projects.error) return <ErrorState error={workspaces.error || projects.error} />;

  return (
    <div className="page">
      <PageHeader
        title="Projects"
        subtitle="Create pilot project records before attaching benchmark suites, guard connectors, and certification runs."
      />
      <div className="grid grid-2">
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Create workspace</h2>
          <form onSubmit={submitWorkspace} style={{ display: 'grid', gap: 12 }}>
            <Field label="Workspace name" value={workspaceDraft.name} onChange={(value) => setWorkspaceDraft((draft) => ({ ...draft, name: value }))} />
            <Field label="Slug" value={workspaceDraft.slug ?? ''} onChange={(value) => setWorkspaceDraft((draft) => ({ ...draft, slug: value || undefined }))} />
            <label>
              <span className="stat-label">Plan</span>
              <select className="btn setup-input" style={{ marginTop: 6 }} value={workspaceDraft.plan} onChange={(event) => setWorkspaceDraft((draft) => ({ ...draft, plan: event.currentTarget.value as WorkspaceInput['plan'] }))}>
                <option value="starter">starter</option>
                <option value="team">team</option>
                <option value="enterprise">enterprise</option>
              </select>
            </label>
            <button className="btn primary" type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Creating...' : 'Create workspace'}
            </button>
            {createWorkspace.isSuccess ? <div className="notice">Workspace created: {createWorkspace.data.workspace.name}</div> : null}
          </form>
        </Card>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Create project</h2>
          <form onSubmit={submitProject} style={{ display: 'grid', gap: 12 }}>
            <label>
              <span className="stat-label">Workspace</span>
              <select className="btn setup-input" style={{ marginTop: 6 }} value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.currentTarget.value)}>
                {workspaceOptions.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </label>
            <Field label="Project name" value={projectDraft.name} onChange={(value) => setProjectDraft((draft) => ({ ...draft, name: value }))} />
            <Field label="Slug" value={projectDraft.slug ?? ''} onChange={(value) => setProjectDraft((draft) => ({ ...draft, slug: value || undefined }))} />
            <div className="setup-grid-two">
              <label>
                <span className="stat-label">Risk tier</span>
                <select className="btn setup-input" style={{ marginTop: 6 }} value={projectDraft.risk_tier} onChange={(event) => setProjectDraft((draft) => ({ ...draft, risk_tier: event.currentTarget.value as ProjectInput['risk_tier'] }))}>
                  <option value="standard">standard</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label>
                <span className="stat-label">Data mode</span>
                <select className="btn setup-input" style={{ marginTop: 6 }} value={projectDraft.data_mode} onChange={(event) => setProjectDraft((draft) => ({ ...draft, data_mode: event.currentTarget.value as ProjectInput['data_mode'] }))}>
                  <option value="redacted_snippets">redacted snippets</option>
                  <option value="hashes_only">hashes only</option>
                  <option value="customer_hosted">customer hosted</option>
                  <option value="raw_allowed">raw allowed</option>
                </select>
              </label>
            </div>
            <Field label="Description" value={projectDraft.description ?? ''} onChange={(value) => setProjectDraft((draft) => ({ ...draft, description: value }))} textarea />
            <button className="btn primary" type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create project'}
            </button>
            {createProject.isSuccess ? <div className="notice">Project created: {createProject.data.project.name}</div> : null}
          </form>
        </Card>
      </div>
      <Card style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Workspace projects</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {projects.data!.projects.map((project) => (
            <div key={project.id} className="project-row">
              <div>
                <strong>{project.name}</strong>
                <div className="mono" style={{ color: 'var(--sc-ink-3)', fontSize: 11 }}>{project.slug}</div>
              </div>
              <Badge tone={project.risk_tier}>{project.risk_tier}</Badge>
              <span className="muted">{project.environment}</span>
              <span className="muted">{project.setup_status ?? 'ready_for_setup'}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span className="stat-label">{label}</span>
      {textarea ? (
        <textarea className="btn setup-input" style={{ minHeight: 76, alignItems: 'flex-start', justifyContent: 'flex-start', resize: 'vertical' }} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
      ) : (
        <input className="btn setup-input" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
      )}
    </label>
  );
}
