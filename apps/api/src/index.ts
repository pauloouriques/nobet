import "dotenv/config";

// Validate environment variables at startup
import { validateServerEnv } from "@nobet/shared/server";
validateServerEnv();

import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { runSync } from "./jobs/sync-odds.js";
import { errorHandler, logger } from "./middleware/index.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

const app = new Hono();

// Odds sync cron: run on start + every 1h (requires node-cron and ODDS_API_KEY)
async function startOddsSyncCron() {
  if (!process.env.ODDS_API_KEY) {
    console.log("[cron] ODDS_API_KEY not set, skipping odds sync cron");
    return;
  }
  type CronSchedule = (expr: string, fn: () => void | Promise<void>) => void;
  let schedule: CronSchedule;
  try {
    const m = (await import("node-cron")) as {
      default?: { schedule: CronSchedule };
      schedule?: CronSchedule;
    };
    schedule = m.default?.schedule ?? m.schedule!;
  } catch {
    console.log("[cron] node-cron not installed, skipping odds sync cron");
    return;
  }
  schedule("0 * * * *", async () => {
    try {
      console.log("[cron] Starting odds sync…");
      const result = await runSync();
      console.log("[cron] Odds sync done:", result);
    } catch (err) {
      console.error("[cron] Odds sync failed:", err);
    }
  });
  console.log("[cron] Odds sync scheduled every hour");

  runSync()
    .then((result) => console.log("[cron] Initial odds sync done:", result))
    .catch((err) => console.error("[cron] Initial odds sync failed:", err));
}

// Global middleware
app.use("*", logger);
app.use("*", errorHandler);

// CORS middleware
app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "https://nobet-web.vercel.app"],
    credentials: true,
  })
);

// Better Auth routes
app.all("/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// tRPC endpoint
app.all("/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: ({ req }) => createContext(req),
  });
});

// Health check endpoint (REST)
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const port = 3000;
console.log(`Server running at http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});

startOddsSyncCron();

export default app;
