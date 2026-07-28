import http from "node:http";

export interface HealthState {
  lastRun: number | null;
  pendingTxs: number;
  processedWindows: number;
  errors: number;
}

/**
 * Minimal HTTP health-check server.
 * GET /health returns JSON with runner status.
 */
export function startHealthServer(
  state: HealthState,
  port: number = 3002,
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "running",
          last_run: state.lastRun,
          pending_txs: state.pendingTxs,
          processed_windows: state.processedWindows,
          errors: state.errors,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  server.listen(port, () => {
    console.log(`[health] listening on :${port}`);
  });

  return server;
}
