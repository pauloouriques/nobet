export declare const router: import("@trpc/server").TRPCRouterBuilder<{
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
}>;
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<{
    db: (import("drizzle-orm/neon-http").NeonHttpDatabase<Record<string, unknown>> & {
        $client: import("@neondatabase/serverless").NeonQueryFunction<any, any>;
    }) | (import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, unknown>> & {
        $client: import("postgres").Sql<{}>;
    });
}, object, object, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
//# sourceMappingURL=trpc.d.ts.map