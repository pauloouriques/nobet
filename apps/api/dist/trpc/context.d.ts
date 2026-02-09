export declare function createContext(): Promise<{
    db: (import("drizzle-orm/neon-http").NeonHttpDatabase<Record<string, unknown>> & {
        $client: import("@neondatabase/serverless").NeonQueryFunction<any, any>;
    }) | (import("drizzle-orm/postgres-js").PostgresJsDatabase<Record<string, unknown>> & {
        $client: import("postgres").Sql<{}>;
    });
}>;
export type Context = Awaited<ReturnType<typeof createContext>>;
//# sourceMappingURL=context.d.ts.map