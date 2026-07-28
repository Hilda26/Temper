// Mirrors the status enums defined in contracts/temper.py. Keep in sync.

export const COMMITMENT_STATUS: Record<number, string> = {
  0: 'DRAFT',
  1: 'BONDING',
  2: 'CAPITALISING',
  3: 'ACTIVE',
  4: 'WATCH',
  5: 'INCIDENT_OPEN',
  6: 'SUSPENDED',
  7: 'WINDING_DOWN',
  8: 'CLOSED',
};

export const OBSERVATION_STATUS: Record<number, string> = {
  0: 'DUE',
  1: 'REQUESTED',
  2: 'CONSENSUS_PENDING',
  3: 'NOMINAL',
  4: 'ANOMALY',
  5: 'FAILED',
  6: 'STALE',
};

export const INCIDENT_STATUS: Record<number, string> = {
  0: 'SUSPECTED',
  1: 'EVIDENCE_GATHERING',
  2: 'PROVISIONAL_VERDICT',
  3: 'CHALLENGE_WINDOW',
  4: 'READJUDICATION_PENDING',
  5: 'RESOLVER_PENDING',
  6: 'FINAL',
  7: 'SETTLEMENT_READY',
  8: 'SETTLED',
  9: 'RECOVERED',
};

export const POLICY_STATUS: Record<number, string> = {
  0: 'PENDING_WAIT',
  1: 'ACTIVE',
  2: 'EXPIRED',
  3: 'INCIDENT_LOCKED',
  4: 'PAYOUT_READY',
  5: 'PAID',
  6: 'CANCELLED',
};

export const SEVERITY: Record<number, string> = {
  0: 'NONE',
  1: 'WARNING',
  2: 'MINOR',
  3: 'MATERIAL',
  4: 'CRITICAL',
};

export const RESPONSIBILITY: Record<number, string> = {
  0: 'OPERATOR',
  1: 'EXTERNAL',
  2: 'CLAIMANT',
  3: 'SHARED',
  4: 'UNKNOWN',
};

// Maps to the badge styles already defined in StatusBadge.tsx. Statuses without
// a close match fall through to StatusBadge's neutral default style.
const BADGE_ALIAS: Record<string, string> = {
  WATCH: 'GRACE_PERIOD',
  INCIDENT_OPEN: 'INCIDENT_OPEN',
  SUSPENDED: 'PAUSED',
  WINDING_DOWN: 'PAUSED',
  ANOMALY: 'BREACH',
  FAILED: 'BREACH',
  SUSPECTED: 'GRACE_PERIOD',
  EVIDENCE_GATHERING: 'OBSERVING',
  PROVISIONAL_VERDICT: 'CHALLENGED',
  CHALLENGE_WINDOW: 'CHALLENGED',
  READJUDICATION_PENDING: 'CHALLENGED',
  RESOLVER_PENDING: 'CHALLENGED',
  FINAL: 'FINALIZED',
  SETTLEMENT_READY: 'FINALIZED',
  SETTLED: 'SETTLED',
  RECOVERED: 'RESOLVED',
  PENDING_WAIT: 'GRACE_PERIOD',
  PAYOUT_READY: 'FINALIZED',
  PAID: 'RESOLVED',
  CANCELLED: 'CLOSED',
  EXPIRED: 'CLOSED',
  INCIDENT_LOCKED: 'INCIDENT_OPEN',
};

export function toBadgeStatus(label: string): string {
  return BADGE_ALIAS[label] || label;
}

export function commitmentStatusLabel(code: number): string {
  return COMMITMENT_STATUS[code] ?? `UNKNOWN(${code})`;
}

export function incidentStatusLabel(code: number): string {
  return INCIDENT_STATUS[code] ?? `UNKNOWN(${code})`;
}

export function observationStatusLabel(code: number): string {
  return OBSERVATION_STATUS[code] ?? `UNKNOWN(${code})`;
}

export function policyStatusLabel(code: number): string {
  return POLICY_STATUS[code] ?? `UNKNOWN(${code})`;
}

export function severityLabel(code: number): string {
  return SEVERITY[code] ?? `UNKNOWN(${code})`;
}

export function responsibilityLabel(code: number): string {
  return RESPONSIBILITY[code] ?? `UNKNOWN(${code})`;
}
