/**
 * Base error class for GenLayer-specific errors.
 */
export class GenLayerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GenLayerError';
  }
}

/**
 * Thrown when a contract read call fails.
 */
export class ContractReadError extends GenLayerError {
  constructor(
    public readonly functionName: string,
    cause?: unknown,
  ) {
    super(`Failed to read contract method "${functionName}"`, cause);
    this.name = 'ContractReadError';
  }
}

/**
 * Thrown when a contract write call fails.
 */
export class ContractWriteError extends GenLayerError {
  constructor(
    public readonly functionName: string,
    cause?: unknown,
  ) {
    super(`Failed to write contract method "${functionName}"`, cause);
    this.name = 'ContractWriteError';
  }
}

/**
 * Thrown when a transaction times out waiting for confirmation.
 */
export class TransactionTimeoutError extends GenLayerError {
  constructor(public readonly txHash: string) {
    super(`Transaction ${txHash} timed out waiting for confirmation`);
    this.name = 'TransactionTimeoutError';
  }
}

/**
 * Thrown when a transaction is rejected or fails on-chain.
 */
export class TransactionFailedError extends GenLayerError {
  constructor(
    public readonly txHash: string,
    public readonly status: string,
  ) {
    super(`Transaction ${txHash} failed with status: ${status}`);
    this.name = 'TransactionFailedError';
  }
}

/**
 * Thrown when the client is not properly configured (e.g. missing account for write operations).
 */
export class ClientConfigError extends GenLayerError {
  constructor(message: string) {
    super(message);
    this.name = 'ClientConfigError';
  }
}

/**
 * Extracts a human-readable error message from a GenLayer or SDK error.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof GenLayerError) {
    return error.message;
  }
  if (error instanceof Error) {
    // Try to extract revert reason from common viem/SDK error shapes
    const message = error.message;
    const revertMatch = message.match(/reverted with reason string '([^']+)'/);
    if (revertMatch) return revertMatch[1];
    const reasonMatch = message.match(/reason:\s*(.+?)(?:\n|$)/);
    if (reasonMatch) return reasonMatch[1].trim();
    return message;
  }
  return String(error);
}
