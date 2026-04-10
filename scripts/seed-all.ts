/**
 * Master seed script — run after fresh database setup.
 * npx tsx scripts/seed-all.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("=== Seeding fresh database ===\n");

  // 1. Admin user
  console.log("1. Creating admin user...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  try {
    await db.insert(schema.users).values({
      email: "admin@propertyrush.com",
      passwordHash,
      name: "Admin",
    }).onConflictDoNothing();
    console.log("   admin@propertyrush.com / admin123\n");
  } catch { console.log("   Already exists\n"); }

  // 2. Bots (100)
  console.log("2. Seeding bots...");
  // Import bot data from seed-bots
  const { default: seedBots } = await import("../lib/db/seed-bots");

  // 3. Starter dates
  console.log("\n3. Seeding starter dates...");
  const dates = [
    { name: "Strawberry", rarity: "common" as const, style: "anime" as const, gender: "female" as const, isStarter: true, priceCredits: 0, personality: "The Empress — glamorous, playful, always sipping", description: "The original PropertyRush icon", thumbnailUrl: "https://r2.propertyrush.net/dates/strawberry.gif" },
  ];
  for (const d of dates) {
    try {
      await db.insert(schema.girlfriends).values({ ...d, modelUrl: "" }).onConflictDoNothing();
      console.log(`   ${d.name} (${d.rarity}, ${d.isStarter ? "FREE" : d.priceCredits + "cr"})`);
    } catch { console.log(`   ${d.name} — already exists`); }
  }

  console.log("\n=== Done! ===");
}

main().catch(console.error);
