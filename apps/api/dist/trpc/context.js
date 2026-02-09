import { db } from "@nobet/db";
export async function createContext() {
    return {
        db,
    };
}
