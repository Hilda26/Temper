import type { CalldataEncodable } from 'genlayer-js/types';
import { createGenLayerClient } from './client';
import { TEMPER_CONTRACT_ADDRESS } from './contract';
import { ContractWriteError, ClientConfigError } from './errors';
import { waitForTransaction } from './transactions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WriteOptions {
  /** Address of the account sending the transaction (used with a local/private key account). */
  account?: `0x${string}`;
  /** EIP-1193 wallet provider (e.g. window.ethereum via MetaMask). Takes precedence over account. */
  provider?: unknown;
}

/** Positional params for create_commitment, in the exact order the contract expects. */
export interface CreateCommitmentParams {
  serviceName: string;
  description: string;
  template: number;
  targetUrl: string;
  backupUrl: string;
  observationInterval: number;
  gracePeriod: number;
  failureThreshold: number;
  minBond: number;
  /** JSON string, e.g. '{"1":0,"2":500,"3":2500,"4":10000}' (severity -> slash bps) */
  slashLadder: string;
  /** JSON string, e.g. '{"0":0,"1":1000,"2":3500,"3":10000}' (tier -> payout bps) */
  payoutTiers: string;
  maxPolicyLimit: number;
  minPolicyLimit: number;
  maxPolicyDuration: number;
  minPolicyDuration: number;
  basePremiumBps: number;
  deductibleBps: number;
  waitingPeriod: number;
  challengeWindow: number;
  maxCumulativeSlashBps: number;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function callWrite(
  options: WriteOptions,
  functionName: string,
  callArgs?: {
    args?: CalldataEncodable[];
    value?: bigint;
  },
): Promise<string> {
  if (!options.account && !options.provider) {
    throw new ClientConfigError('An account or provider is required for write operations');
  }

  const client = createGenLayerClient({
    account: options.account,
    provider: options.provider,
  });

  try {
    const txHash = (await client.writeContract({
      address: TEMPER_CONTRACT_ADDRESS,
      functionName,
      args: callArgs?.args ?? [],
      value: callArgs?.value ?? BigInt(0),
    })) as string;
    await waitForTransaction(txHash);
    return txHash;
  } catch (error) {
    throw new ContractWriteError(functionName, error);
  }
}

// ---------------------------------------------------------------------------
// Commitment lifecycle (operator)
// ---------------------------------------------------------------------------

/** Create a new commitment. Returns the tx hash; read the new ID via get_system_counts(). */
export async function createCommitment(options: WriteOptions, p: CreateCommitmentParams) {
  return callWrite(options, 'create_commitment', {
    args: [
      p.serviceName,
      p.description,
      p.template,
      p.targetUrl,
      p.backupUrl,
      p.observationInterval,
      p.gracePeriod,
      p.failureThreshold,
      p.minBond,
      p.slashLadder,
      p.payoutTiers,
      p.maxPolicyLimit,
      p.minPolicyLimit,
      p.maxPolicyDuration,
      p.minPolicyDuration,
      p.basePremiumBps,
      p.deductibleBps,
      p.waitingPeriod,
      p.challengeWindow,
      p.maxCumulativeSlashBps,
    ],
  });
}

/** Deposit the operator's initial bond into a DRAFT commitment. Payable. */
export async function depositOperatorBond(options: WriteOptions, commitmentId: number, value: bigint) {
  return callWrite(options, 'deposit_operator_bond', { args: [commitmentId], value });
}

/** Activate a commitment once its bond meets the minimum. */
export async function activateCommitment(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'activate_commitment', { args: [commitmentId] });
}

/** Top up an existing bond (also used to cure a suspended commitment). Payable. */
export async function addOperatorBond(options: WriteOptions, commitmentId: number, value: bigint) {
  return callWrite(options, 'add_operator_bond', { args: [commitmentId], value });
}

/** Begin winding down an active commitment (stops new coverage purchases). */
export async function beginWindDown(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'begin_wind_down', { args: [commitmentId] });
}

/** Request (and immediately execute) the operator bond withdrawal once wound down. */
export async function requestBondWithdrawal(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'request_bond_withdrawal', { args: [commitmentId] });
}

/** Execute a queued bond withdrawal (currently identical to request_bond_withdrawal on-chain). */
export async function executeBondWithdrawal(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'execute_bond_withdrawal', { args: [commitmentId] });
}

// ---------------------------------------------------------------------------
// Underwriter: coverage capital
// ---------------------------------------------------------------------------

/** Deposit coverage capital into a commitment's vault. Payable. */
export async function depositCoverageCapital(options: WriteOptions, commitmentId: number, value: bigint) {
  return callWrite(options, 'deposit_coverage_capital', { args: [commitmentId], value });
}

/** Request withdrawal of underwriter shares from a vault. */
export async function requestUnderwriterWithdrawal(options: WriteOptions, commitmentId: number, shares: number) {
  return callWrite(options, 'request_underwriter_withdrawal', { args: [commitmentId, shares] });
}

/** Cancel a pending underwriter withdrawal request. */
export async function cancelUnderwriterWithdrawal(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'cancel_underwriter_withdrawal', { args: [commitmentId] });
}

/** Execute a previously requested underwriter withdrawal. */
export async function executeUnderwriterWithdrawal(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'execute_underwriter_withdrawal', { args: [commitmentId] });
}

// ---------------------------------------------------------------------------
// Policyholder: coverage
// ---------------------------------------------------------------------------

/** Purchase coverage (create a policy). Payable — value is the premium. */
export async function purchaseCoverage(
  options: WriteOptions,
  commitmentId: number,
  limit: number,
  duration: number,
  value: bigint,
) {
  return callWrite(options, 'purchase_coverage', { args: [commitmentId, limit, duration], value });
}

/** Activate a policy after its waiting period has elapsed. */
export async function activateWaitingPolicy(options: WriteOptions, policyId: number) {
  return callWrite(options, 'activate_waiting_policy', { args: [policyId] });
}

/** Claim payout for a policy after an incident is settled. */
export async function claimPayout(options: WriteOptions, policyId: number) {
  return callWrite(options, 'claim_payout', { args: [policyId] });
}

/**
 * Expire past-term policies on a commitment and release their reserved capital.
 * Permissionless — anyone may call it to clear stale reservations.
 */
export async function sweepExpiredPolicies(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'sweep_expired_policies', { args: [commitmentId] });
}

// ---------------------------------------------------------------------------
// Observation (observer runner / anyone)
// ---------------------------------------------------------------------------

/** Trigger an observation for a commitment (nondeterministic web fetch + consensus). */
export async function requestObservation(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'request_observation', { args: [commitmentId] });
}

// ---------------------------------------------------------------------------
// Incidents & adjudication
// ---------------------------------------------------------------------------

/** Manually open a suspected incident for a commitment. */
export async function openSuspectedIncident(options: WriteOptions, commitmentId: number) {
  return callWrite(options, 'open_suspected_incident', { args: [commitmentId] });
}

/** Request a fresh observation cycle while an incident is under evidence-gathering. */
export async function requestIncidentUpdate(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'request_incident_update', { args: [incidentId] });
}

/** Request a recovery check for an incident (alias of request_incident_update on-chain). */
export async function requestRecoveryCheck(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'request_recovery_check', { args: [incidentId] });
}

/** Operator challenges a provisional verdict / opens the readjudication path. */
export async function challengeIncident(options: WriteOptions, incidentId: number, counterEvidenceUrls: string) {
  return callWrite(options, 'challenge_incident', { args: [incidentId, counterEvidenceUrls] });
}

/** Append additional counter-evidence URLs to a challenged incident. */
export async function submitCounterEvidence(options: WriteOptions, incidentId: number, urls: string) {
  return callWrite(options, 'submit_counter_evidence', { args: [incidentId, urls] });
}

/** Trigger the readjudication evaluation after counter-evidence is submitted. */
export async function requestReadjudication(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'request_readjudication', { args: [incidentId] });
}

/** Finalize a provisional verdict once the challenge window has elapsed. */
export async function finalizeProvisionalVerdict(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'finalize_provisional_verdict', { args: [incidentId] });
}

/** Finalize an incident, settling slashes and payouts. */
export async function finalizeIncident(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'finalize_incident', { args: [incidentId] });
}

/** Accept assignment as the human resolver for a deadlocked incident. */
export async function acceptResolverAssignment(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'accept_resolver_assignment', { args: [incidentId] });
}

/** Declare a conflict of interest, requiring resolver reassignment. */
export async function declareResolverConflict(options: WriteOptions, incidentId: number) {
  return callWrite(options, 'declare_resolver_conflict', { args: [incidentId] });
}

/** Submit the human resolver's ruling and severity for a disputed incident. */
export async function submitResolverRuling(
  options: WriteOptions,
  incidentId: number,
  ruling: string,
  severity: string,
) {
  return callWrite(options, 'submit_resolver_ruling', { args: [incidentId, ruling, severity] });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Pause or unpause the entire protocol. Admin only. */
export async function setPaused(options: WriteOptions, paused: boolean) {
  return callWrite(options, 'set_paused', { args: [paused] });
}

/** Withdraw accumulated protocol fees from the treasury. Admin only. */
export async function withdrawProtocolTreasury(options: WriteOptions, amount: bigint) {
  return callWrite(options, 'withdraw_protocol_treasury', { args: [Number(amount)] });
}
