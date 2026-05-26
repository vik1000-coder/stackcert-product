const fallbackDemoPath = '/app/ws_demo/proj_acme_copilot/overview';
const fallbackBetaPath = '/onboarding?resume=1';
const demoProjectPath = '/app/ws_demo/proj_acme_copilot';

const allowedAppSections = new Set([
  'overview',
  'ranking',
  'co-failure',
  'measurements',
  'certificate',
  'drift',
  'setup',
  'projects',
  'admin'
]);

export const demoEmail = 'demo@stackcert.dev';
export const demoPassword = 'stackcert-demo';

export function authDestination(next: string | null, flow: 'beta' | 'demo') {
  if (!next) return flow === 'demo' ? fallbackDemoPath : fallbackBetaPath;
  if (flow === 'demo') {
    return isAllowedDemoDestination(next) ? next : fallbackDemoPath;
  }
  if (next.startsWith('/onboarding')) return next;
  if (next.startsWith('/app/') && !next.startsWith('/app/ws_demo/')) return next;
  return fallbackBetaPath;
}

export function isDemoEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() === demoEmail;
}

function isAllowedDemoDestination(next: string) {
  try {
    const parsed = new URL(next, 'https://stackcert.local');
    if (parsed.origin !== 'https://stackcert.local') return false;
    const normalizedPath = parsed.pathname.replace(/\/$/, '');
    if (normalizedPath === demoProjectPath) return true;
    if (!normalizedPath.startsWith(`${demoProjectPath}/`)) return false;
    const section = normalizedPath.slice(demoProjectPath.length + 1);
    return allowedAppSections.has(section);
  } catch {
    return false;
  }
}
