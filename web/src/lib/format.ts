export function fmtNumber(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return value.toFixed(digits);
}

export function fmtPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return `${(value * 100).toFixed(digits)}%`;
}

export function fmtUsd(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

export function statusTone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (['valid', 'certified', 'succeeded', 'complete'].includes(status)) return 'ok';
  if (['provisional', 'warning', 'needs_measurement', 'queued', 'open'].includes(status)) return 'warn';
  if (['failed', 'revoked', 'expired', 'negative', 'critical'].includes(status)) return 'bad';
  return 'neutral';
}

