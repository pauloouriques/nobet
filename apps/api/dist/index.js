import "dotenv/config";
// Validate environment variables at startup
import { validateServerEnv } from "@nobet/shared/server";
validateServerEnv();
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, logger } from "./middleware/index.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
const app = new Hono();
// Global middleware
app.use("*", logger);
app.use("*", errorHandler);
// CORS middleware
app.use("/*", cors({
    origin: ["http://localhost:5173", "https://nobet-web.vercel.app"],
    credentials: true,
}));
// tRPC endpoint
app.all("/trpc/*", async (c) => {
    return fetchRequestHandler({
        endpoint: "/trpc",
        req: c.req.raw,
        router: appRouter,
        createContext,
    });
});
// Health check endpoint (REST)
app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Local development server
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = 3000;
    console.log(`🚀 Server running at http://localhost:${port}`);
    serve({
        fetch: app.fetch,
        port,
    });
}
export default app;
