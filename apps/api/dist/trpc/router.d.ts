export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        db: (import("drizzle-orm/neon-http").NeonHttpDatabase<Record<string, unknown>> & {
            $client: import("@neondatabase/serverless").NeonQueryFunction<any, any>;
        }) | (import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, unknown>> & {
            $client: import("postgres").Sql<{}>;
        });
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    health: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            db: (import("drizzle-orm/neon-http").NeonHttpDatabase<Record<string, unknown>> & {
                $client: import("@neondatabase/serverless").NeonQueryFunction<any, any>;
            }) | (import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, unknown>> & {
                $client: import("postgres").Sql<{}>;
            });
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        check: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                status: string;
                timestamp: string;
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=router.d.ts.map