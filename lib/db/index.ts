import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Strip "DATABASE_URL=" prefix if accidentally included in the env var value
let databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder";
if (databaseUrl.startsWith("DATABASE_URL=")) databaseUrl = databaseUrl.slice("DATABASE_URL=".length);
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
export { schema };
