import { healthRouter } from "../routes/health.js";
import { router } from "./trpc.js";

export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
