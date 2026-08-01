import type { CalldataEncodable } from 'genlayer-js/types';
import { getReadClient } from './client';
import { TEMPER_CONTRACT_ADDRESS } from './contract';
import { ContractReadError } from './errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VIEW_RETRY_COUNT = 2;
const VIEW_RETRY_DELAY_MS = 750;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Internal helper that calls a view method on the Temper contract and returns
 * the decoded result. All public read functions delegate to this.
 */
async function callView(
  functionName: string,
  args?: CalldataEncodable[],
  kwargs?: Record<string, CalldataEncodable>,
): Promise<CalldataEncodable> {
  const client = getReadClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= VIEW_RETRY_COUNT; attempt += 1) {
    try {
      return await client.readContract({
        address: TEMPER_CONTRACT_ADDRESS,
        functionName,
        ...(args ? { args } : {}),
        ...(kwargs ? { kwargs } : {}),
      });
    } catch (error) {
      lastError = error;
      if (attempt < VIEW_RETRY_COUNT) {
        await sleep(VIEW_RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new ContractReadError(functionName, lastError);
}
/**
 * Parse a JSON string result from a view method, or return the value directly
 * if it is already an object.
 */
function parseResult<T>(value: CalldataEncodable): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  return value as unknown as T;
}

// ---------------------------------------------------------------------------
// Public read functions — one per contract view method
// ---------------------------------------------------------------------------

/** Commitment (pool) details by ID. */
export async function getCommitment(id: bigint) {
  const result = await callView('get_commitment', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Policy configuration for a commitment. */
export async function getCommitmentPolicy(id: bigint) {
  const result = await callView('get_commitment_policy', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Capital state for a commitment. */
export async function getCapitalState(id: bigint) {
  const result = await callView('get_capital_state', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Policy details by ID. */
export async function getPolicy(id: bigint) {
  const result = await callView('get_policy', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Incident details by ID. */
export async function getIncident(id: bigint) {
  const result = await callView('get_incident', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Observation details by ID. */
export async function getObservation(id: bigint) {
  const result = await callView('get_observation', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Evidence summary for an incident. */
export async function getIncidentEvidenceSummary(id: bigint) {
  const result = await callView('get_incident_evidence_summary', [Number(id)]);
  return parseResult<Record<string, unknown>>(result);
}

/** History of incidents for a given commitment. */
export async function getIncidentHistory(commitmentId: bigint): Promise<number[]> {
  const result = await callView('get_incident_history', [Number(commitmentId)]);
  return parseResult<number[]>(result);
}

/** Eligibility details for a policy. */
export async function getPolicyEligibility(policyId: bigint) {
  const result = await callView('get_policy_eligibility', [Number(policyId)]);
  return parseResult<Record<string, unknown>>(result);
}

/** Claimable payout amount (in wei) for a policy. */
export async function getClaimablePayout(policyId: bigint): Promise<bigint> {
  const result = await callView('get_claimable_payout', [Number(policyId)]);
  return BigInt(result as string | number);
}

/** List of commitment IDs where the given operator has positions. */
export async function getOperatorPositions(operator: string): Promise<number[]> {
  const result = await callView('get_operator_positions', [operator]);
  return parseResult<number[]>(result);
}

/** Underwriter position details for a specific commitment and underwriter. */
export async function getUnderwriterPosition(commitmentId: bigint, underwriter: string) {
  const result = await callView('get_underwriter_position', [Number(commitmentId), underwriter]);
  return parseResult<Record<string, unknown>>(result);
}

/** List of policy IDs held by a given address. */
export async function getHolderPolicies(holder: string): Promise<number[]> {
  const result = await callView('get_holder_policies', [holder]);
  return parseResult<number[]>(result);
}

/** List of observation IDs that are due for processing. */
export async function getDueObservations(): Promise<number[]> {
  const result = await callView('get_due_observations');
  return parseResult<number[]>(result);
}

/** List of currently active incident IDs. */
export async function getActiveIncidents(): Promise<number[]> {
  const result = await callView('get_active_incidents');
  return parseResult<number[]>(result);
}

/** System-wide counts (commitments, policies, incidents, observations). */
export async function getSystemCounts() {
  const result = await callView('get_system_counts');
  return parseResult<Record<string, number>>(result);
}

/** Contract's own balance in wei. */
export async function getContractBalance(): Promise<bigint> {
  const result = await callView('get_contract_balance');
  return BigInt(result as string | number);
}

// ---------------------------------------------------------------------------
// Bulk list helpers — the contract has no bulk view methods, so these fetch
// system counts first and then read each entity by ID in parallel.
// ---------------------------------------------------------------------------

async function settleEntityList<T extends Record<string, unknown>>(
  ids: number[],
  loader: (id: number) => Promise<T>,
  entityName: string,
): Promise<T[]> {
  const settled = await Promise.allSettled(ids.map((id) => loader(id)));
  const fulfilled: T[] = [];
  let firstError: unknown;

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      if (Object.keys(result.value).length > 0) fulfilled.push(result.value);
    } else {
      firstError ??= result.reason;
    }
  }

  if (fulfilled.length === 0 && firstError) {
    throw new ContractReadError(entityName, firstError);
  }

  return fulfilled;
}

/** All commitments, IDs 1..commitments count, newest first. */
export async function listCommitments(): Promise<Record<string, unknown>[]> {
  const counts = await getSystemCounts();
  const total = counts.commitments ?? 0;
  if (total === 0) return [];
  const ids = Array.from({ length: total }, (_, i) => total - i);
  return settleEntityList(ids, (id) => getCommitment(BigInt(id)), 'list_commitments');
}

/** All incidents, IDs 1..incidents count, newest first. */
export async function listIncidents(): Promise<Record<string, unknown>[]> {
  const counts = await getSystemCounts();
  const total = counts.incidents ?? 0;
  if (total === 0) return [];
  const ids = Array.from({ length: total }, (_, i) => total - i);
  return settleEntityList(ids, (id) => getIncident(BigInt(id)), 'list_incidents');
}

/** All policies, IDs 1..policies count, newest first. */
export async function listPolicies(): Promise<Record<string, unknown>[]> {
  const counts = await getSystemCounts();
  const total = counts.policies ?? 0;
  if (total === 0) return [];
  const ids = Array.from({ length: total }, (_, i) => total - i);
  return settleEntityList(ids, (id) => getPolicy(BigInt(id)), 'list_policies');
}
