import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { statusTone } from '../lib/format';

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size, borderRadius: Math.max(6, size / 3) }}>
      #
    </span>
  );
}

export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: string; dot?: boolean }) {
  const normalized = tone === 'neutral' ? '' : tone === 'ok' || tone === 'warn' || tone === 'bad' ? tone : statusTone(tone);
  return (
    <span className={`badge ${normalized}`}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

export function ButtonLink({ to, children, variant = 'default' }: { to: string; children: ReactNode; variant?: 'default' | 'primary' | 'accent' }) {
  return (
    <Link className={`btn ${variant === 'default' ? '' : variant}`} to={to}>
      {children}
    </Link>
  );
}

export function ExternalButton({ href, children, variant = 'default' }: { href: string; children: ReactNode; variant?: 'default' | 'primary' | 'accent' }) {
  return (
    <a className={`btn ${variant === 'default' ? '' : variant}`} href={href}>
      {children}
    </a>
  );
}

export function Card({ children, padded = true, style }: { children: ReactNode; padded?: boolean; style?: CSSProperties }) {
  return <div className={`card ${padded ? 'card-pad' : ''}`} style={style}>{children}</div>;
}

export function Stat({
  label,
  value,
  tone,
  description
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  description?: ReactNode;
}) {
  return (
    <Card>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone ? { color: `var(--sc-${tone})` } : undefined}>
        {value}
      </div>
      {description ? <div className="stat-description">{description}</div> : null}
    </Card>
  );
}

export function Explainer({
  title,
  children,
  tone = 'neutral',
  style
}: {
  title: string;
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn';
  style?: CSSProperties;
}) {
  return (
    <div className={`explainer ${tone}`} style={style}>
      <div className="explainer-title">{title}</div>
      <div className="explainer-copy">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div> : null}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="page">
      <Card>
        <div className="muted">Loading StackCert evidence...</div>
      </Card>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="page">
      <Card>
        <Badge tone="bad" dot>
          API unavailable
        </Badge>
        <p className="muted" style={{ marginBottom: 0 }}>
          {error instanceof Error ? error.message : 'The API request failed.'}
        </p>
      </Card>
    </div>
  );
}
