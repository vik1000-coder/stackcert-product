import { Link, useOutletContext } from 'react-router-dom';
import type { RunSummary } from './api';
import { Card } from '../components/Primitives';

export type StackCertAppContext = {
  workspaceId: string;
  projectId: string;
  activeRunId?: string;
  runsLoading: boolean;
  runs: RunSummary[];
};

export function useStackCertApp() {
  return useOutletContext<StackCertAppContext>();
}

export function NoRunState({ title = 'No evidence run yet' }: { title?: string }) {
  return (
    <div className="page">
      <Card>
        <h1 style={{ marginTop: 0, fontSize: 26 }}>{title}</h1>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Add an example suite and upload safety-check outputs in setup. StackCert will then rank the combinations,
          estimate remaining tests, and prepare release evidence for this app.
        </p>
        <Link className="btn primary" to="../setup">
          Go to app setup
        </Link>
      </Card>
    </div>
  );
}
