import { Link } from 'react-router-dom';
import { Badge, Card } from './Primitives';

export type FirstReportJourneyStep =
  | 'scope'
  | 'examples'
  | 'options'
  | 'run'
  | 'recommendation'
  | 'report'
  | 'retest';

type JourneyLinkMap = Partial<Record<FirstReportJourneyStep, string>>;

const journeySteps: Array<{ id: FirstReportJourneyStep; label: string; copy: string }> = [
  {
    id: 'scope',
    label: 'App scope',
    copy: 'Name the LLM workflow and the release decision you need to make.'
  },
  {
    id: 'examples',
    label: 'Examples',
    copy: 'Load normal and risky examples that represent this app.'
  },
  {
    id: 'options',
    label: 'Safety options',
    copy: 'Add the checks, judges, routes, or policies you might ship.'
  },
  {
    id: 'run',
    label: 'Test run',
    copy: 'Run checks or upload outputs so every option is comparable.'
  },
  {
    id: 'recommendation',
    label: 'Recommendation',
    copy: 'Review the combination that best fits safety, usefulness, cost, and latency.'
  },
  {
    id: 'report',
    label: 'Release report',
    copy: 'Lock the scoped record reviewers can use before launch.'
  },
  {
    id: 'retest',
    label: 'Retest or gate',
    copy: 'Refresh the report or fail closed when release context changes.'
  }
];

export function FirstReportJourney({
  title = 'First release report path',
  intro = 'Bring one LLM app, compare the safety checks you might ship, and get a scoped release report.',
  activeStep,
  links = {},
  compact = false
}: {
  title?: string;
  intro?: string;
  activeStep?: FirstReportJourneyStep;
  links?: JourneyLinkMap;
  compact?: boolean;
}) {
  return (
    <section className={`first-report-journey ${compact ? 'compact' : ''}`} aria-label={title}>
      <Card>
        <div className="first-report-head">
          <div>
            <div className="stat-label">First pilot path</div>
            <h2>{title}</h2>
            <p>{intro}</p>
          </div>
          <Badge tone="neutral">Your app, your examples, your safety options</Badge>
        </div>
        <ol className="first-report-steps">
          {journeySteps.map((step, index) => {
            const content = (
              <>
                <span className="first-report-index mono">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.copy}</small>
                </span>
              </>
            );
            const className = `first-report-step ${activeStep === step.id ? 'active' : ''}`;
            return (
              <li key={step.id}>
                {links[step.id] ? (
                  <Link className={className} to={links[step.id]!}>
                    {content}
                  </Link>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
