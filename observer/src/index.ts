import "dotenv/config";
import { buildClient } from "./client.js";
import { startHealthServer, type HealthState } from "./health.js";
import { TransactionStatus } from "genlayer-js/types";
import { initTelemetry, registerInstance, heartbeat, recordRun, markOffline } from "./telemetry.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RPC_URL = process.env.OBSERVER_RPC_URL ?? "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = process.env.OBSERVER_CONTRACT_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.OBSERVER_PRIVATE_KEY as `0x${string}`;
const INTERVAL_MS = Number(process.env.OBSERVER_INTERVAL_MS ?? "60000");
const HEALTH_PORT = Number(process.env.OBSERVER_HEALTH_PORT ?? "3002");

if (!CONTRACT_ADDRESS) {
  console.error("[fatal] OBSERVER_CONTRACT_ADDRESS is required");
  process.exit(1);
}
if (!PRIVATE_KEY) {
  console.error("[fatal] OBSERVER_PRIVATE_KEY is required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Tracks (commitmentId, windowTimestamp) pairs already processed. */
const processedWindows = new Set<string>();

/** Pending write-transaction hashes we are still waiting on. */
const pendingTxHashes = new Set<string>();

/** Shared mutable health state exposed via /health. */
const health: HealthState = {
  lastRun: null,
  pendingTxs: 0,
  processedWindows: 0,
  errors: 0,
};

// Exponential backoff state
let consecutiveFailures = 0;
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const { client, account, contractAddress } = buildClient({
  rpcUrl: RPC_URL,
  contractAddress: CONTRACT_ADDRESS,
  privateKey: PRIVATE_KEY,
});

// ---------------------------------------------------------------------------
// Core loop
// ---------------------------------------------------------------------------

async function tick(): Promise<void> {
  const now = Date.now();
  const windowTs = Math.floor(now / 1000);

  console.log(`[tick] ${new Date(now).toISOString()}`);

  // 1. Read due observations (view call -- no gas)
  let dueIds: number[];
  try {
    const raw = await client.readContract({
      address: contractAddress,
      functionName: "get_due_observations",
      args: [],
    });
    // The contract returns a JSON-encoded array string
    dueIds = typeof raw === "string" ? JSON.parse(raw) : (raw as number[]);
  } catch (err) {
    console.error("[tick] failed to read due observations:", err);
    throw err; // let the caller apply backoff
  }

  if (dueIds.length === 0) {
    console.log("[tick] nothing due");
    return;
  }

  console.log(`[tick] ${dueIds.length} due: [${dueIds.join(", ")}]`);

  // 2. For each due commitment, submit request_observation (write tx)
  for (const commitmentId of dueIds) {
    const idempotencyKey = `${commitmentId}:${windowTs}`;
    if (processedWindows.has(idempotencyKey)) {
      console.log(`[tick] skip ${commitmentId} (already processed this window)`);
      continue;
    }

    try {
      console.log(`[tick] requesting observation for commitment ${commitmentId}`);

      const txHash = await client.writeContract({
        address: contractAddress,
        functionName: "request_observation",
        args: [commitmentId],
        value: 0n,
      });

      const hashStr = String(txHash);
      pendingTxHashes.add(hashStr);
      health.pendingTxs = pendingTxHashes.size;

      console.log(`[tick] tx submitted: ${hashStr}`);

      // Mark this window as processed so concurrent runners / retries
      // don't double-submit for the same window.
      processedWindows.add(idempotencyKey);
      health.processedWindows = processedWindows.size;

      // Fire-and-forget receipt wait -- we log the outcome but don't
      // block the loop.
      waitForReceipt(hashStr, commitmentId).catch(() => {});
      void recordRun({ commitmentId, txHash: hashStr, result: "SUCCESS" });
    } catch (err) {
      console.error(`[tick] write failed for commitment ${commitmentId}:`, err);
      // Don't rethrow -- try the next commitment.
      health.errors++;
      void recordRun({
        commitmentId,
        result: "ERROR",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

async function waitForReceipt(
  txHash: string,
  commitmentId: number,
): Promise<void> {
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}` & { length: 66 },
      status: TransactionStatus.ACCEPTED,
      retries: 60,
      interval: 3000,
    });

    const status = receipt.statusName ?? receipt.status;
    console.log(
      `[receipt] commitment=${commitmentId} tx=${txHash} status=${status}`,
    );
  } catch (err) {
    console.error(`[receipt] failed for ${txHash}:`, err);
    health.errors++;
  } finally {
    pendingTxHashes.delete(txHash);
    health.pendingTxs = pendingTxHashes.size;
  }
}

// ---------------------------------------------------------------------------
// Scheduling with exponential backoff
// ---------------------------------------------------------------------------

function nextDelay(): number {
  if (consecutiveFailures === 0) return INTERVAL_MS;
  const backoff = Math.min(
    INTERVAL_MS * Math.pow(2, consecutiveFailures),
    MAX_BACKOFF_MS,
  );
  // Add jitter: 0.5x - 1.5x
  return Math.floor(backoff * (0.5 + Math.random()));
}

async function loop(): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
      health.lastRun = Date.now();
      consecutiveFailures = 0;
    } catch {
      consecutiveFailures++;
      health.errors++;
      console.error(
        `[loop] failure #${consecutiveFailures}, next retry in ${nextDelay()}ms`,
      );
    }

    const delay = nextDelay();
    await sleep(delay);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

console.log("=== Temper Observer Runner ===");
console.log(`  contract : ${CONTRACT_ADDRESS}`);
console.log(`  rpc      : ${RPC_URL}`);
console.log(`  interval : ${INTERVAL_MS}ms`);
console.log(`  health   : :${HEALTH_PORT}`);
console.log("");

initTelemetry();
void registerInstance(account.address);
setInterval(() => void heartbeat(), 30_000);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await markOffline();
    process.exit(0);
  });
}

startHealthServer(health, HEALTH_PORT);
loop().catch((err) => {
  console.error("[fatal] unrecoverable error:", err);
  process.exit(1);
});
