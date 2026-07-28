import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;
let instanceId: string | null = null;

const INSTANCE_NAME = process.env.OBSERVER_INSTANCE_NAME ?? `observer-${process.pid}`;

/**
 * Telemetry is best-effort only. If Supabase isn't configured, or any call
 * fails, we log and continue — the observer's on-chain loop never depends
 * on this succeeding.
 */
export function initTelemetry(): void {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("[telemetry] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set, telemetry disabled");
    return;
  }
  supabase = createClient(url, key, { auth: { persistSession: false } });
}

export async function registerInstance(walletAddress: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from("observer_instances")
      .upsert(
        {
          instance_name: INSTANCE_NAME,
          wallet_address: walletAddress,
          status: "ONLINE",
          last_heartbeat_at: new Date().toISOString(),
          version: "0.1.0",
        },
        { onConflict: "instance_name" },
      )
      .select("id")
      .single();
    if (error) throw error;
    instanceId = data.id;
  } catch (err) {
    console.error("[telemetry] failed to register instance:", err);
  }
}

export async function heartbeat(status: "ONLINE" | "DEGRADED" = "ONLINE"): Promise<void> {
  if (!supabase || !instanceId) return;
  try {
    const { error } = await supabase
      .from("observer_instances")
      .update({ status, last_heartbeat_at: new Date().toISOString() })
      .eq("id", instanceId);
    if (error) throw error;
  } catch (err) {
    console.error("[telemetry] heartbeat failed:", err);
  }
}

export async function recordRun(entry: {
  commitmentId?: number;
  observationId?: number;
  txHash?: string;
  result: "SUCCESS" | "ERROR" | "SKIPPED";
  errorMessage?: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("observer_runs").insert({
      instance_id: instanceId,
      commitment_id: entry.commitmentId,
      observation_id: entry.observationId,
      tx_hash: entry.txHash,
      result: entry.result,
      error_message: entry.errorMessage,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[telemetry] recordRun failed:", err);
  }
}

export async function markOffline(): Promise<void> {
  if (!supabase || !instanceId) return;
  try {
    await supabase.from("observer_instances").update({ status: "OFFLINE" }).eq("id", instanceId);
  } catch {
    // best effort on shutdown
  }
}
