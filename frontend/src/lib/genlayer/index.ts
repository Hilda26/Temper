// Configuration
export { GENLAYER_CONFIG } from './config';

// Client
export { createGenLayerClient, getReadClient, resetReadClient } from './client';
export type { GenLayerClient } from './client';

// Contract
export { TEMPER_CONTRACT_ADDRESS, getContractSchema, resetContractSchema } from './contract';

// Read (view) methods
export {
  getCommitment,
  getCommitmentPolicy,
  getCapitalState,
  getPolicy,
  getIncident,
  getObservation,
  getIncidentEvidenceSummary,
  getIncidentHistory,
  getPolicyEligibility,
  getClaimablePayout,
  getOperatorPositions,
  getUnderwriterPosition,
  getHolderPolicies,
  getDueObservations,
  getActiveIncidents,
  getSystemCounts,
  getContractBalance,
  listCommitments,
  listIncidents,
  listPolicies,
} from './reads';

// Status label mappings (numeric enum -> string, matching contracts/temper.py)
export {
  commitmentStatusLabel,
  incidentStatusLabel,
  observationStatusLabel,
  policyStatusLabel,
  severityLabel,
  responsibilityLabel,
  toBadgeStatus,
} from './statusLabels';

// Write (transaction) methods
export type { WriteOptions, CreateCommitmentParams } from './writes';
export {
  createCommitment,
  depositOperatorBond,
  activateCommitment,
  addOperatorBond,
  beginWindDown,
  requestBondWithdrawal,
  executeBondWithdrawal,
  depositCoverageCapital,
  requestUnderwriterWithdrawal,
  cancelUnderwriterWithdrawal,
  executeUnderwriterWithdrawal,
  purchaseCoverage,
  claimPayout,
  requestObservation,
  openSuspectedIncident,
  requestIncidentUpdate,
  requestRecoveryCheck,
  challengeIncident,
  submitCounterEvidence,
  requestReadjudication,
  finalizeProvisionalVerdict,
  finalizeIncident,
  acceptResolverAssignment,
  declareResolverConflict,
  submitResolverRuling,
  setPaused,
  withdrawProtocolTreasury,
} from './writes';

// Value conversion utilities
export { toWei, fromWei, formatGEN } from './values';

// Transaction tracking
export type { TransactionReceipt } from './transactions';
export { waitForTransaction, getTransactionStatus } from './transactions';

// Explorer URL builders
export { txUrl, addressUrl, contractUrl } from './explorer';

// Error handling
export {
  GenLayerError,
  ContractReadError,
  ContractWriteError,
  TransactionTimeoutError,
  TransactionFailedError,
  ClientConfigError,
  extractErrorMessage,
} from './errors';
