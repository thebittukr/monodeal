import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const rows = await db.select({ id: schema.girlfriends.id, name: schema.girlfriends.name, modelUrl: schema.girlfriends.modelUrl }).from(schema.girlfriends);
  console.log("Current dates:");
  rows.forEach(r => console.log(`  ${r.name} → ${r.modelUrl}`));

  const updates: Record<string, string> = {
    "Lily Park": "/models/skye.glb",
    "Jay Santos": "/models/hips.glb",
    "Pixel": "/models/helen.glb",
    "Ryder Cole": "/models/crimson.glb",
  };

  for (const [name, model] of Object.entries(updates)) {
    await db.update(schema.girlfriends).set({ modelUrl: model }).where(eq(schema.girlfriends.name, name));
    console.log(`  Updated ${name} → ${model}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
