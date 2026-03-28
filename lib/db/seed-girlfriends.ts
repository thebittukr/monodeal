/**
 * Seed script for the 4 free starter girlfriends.
 * Run with: npx tsx lib/db/seed-girlfriends.ts
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const STARTERS = [
  {
    name: "Lily Park",
    rarity: "common" as const,
    modelUrl: "/models/skye.glb", // reuse existing model for now
    style: "casual" as const,
    gender: "female" as const,
    isStarter: true,
    priceCredits: 0,
    description: "Your bestie who always has your back",
    personality: "The Bestie — supportive, relatable, casual reactions",
    backstory: "College roommate who got you into card games. She believes in you no matter what.",
  },
  {
    name: "Jasmine Santos",
    rarity: "common" as const,
    modelUrl: "/models/hips.glb",
    style: "casual" as const,
    gender: "female" as const,
    isStarter: true,
    priceCredits: 0,
    description: "The chill one with the sharp observations",
    personality: "The Chill Queen — laid back, witty, never stressed",
    backstory: "Coffee shop regular who turned out to be a secret card shark. Plays it cool, always.",
  },
  {
    name: "Pixel",
    rarity: "common" as const,
    modelUrl: "/models/helen.glb",
    style: "anime" as const,
    gender: "female" as const,
    isStarter: true,
    priceCredits: 0,
    description: "Gamer girl with competitive spirit",
    personality: "The Gamer Girl — gaming references, competitive spirit, hype energy",
    backstory: "Speedrunner who beat every card game AI. Now she coaches humans for fun.",
  },
  {
    name: "Ruby Cole",
    rarity: "common" as const,
    modelUrl: "/models/crimson.glb",
    style: "cyberpunk" as const,
    gender: "female" as const,
    isStarter: true,
    priceCredits: 0,
    description: "The hype queen who never stops cheering",
    personality: "The Hype Queen — maximum energy, maximum volume",
    backstory: "Former extreme sports commentator. Got banned for being too loud. Your gain.",
  },
];

async function seed() {
  console.log("Seeding 4 starter girlfriends...");

  for (const gf of STARTERS) {
    await db.insert(schema.girlfriends).values(gf).onConflictDoNothing();
    console.log(`  ✓ ${gf.name} (${gf.gender}, ${gf.style})`);
  }

  console.log("Done! 4 starters seeded.");
}

seed().catch(console.error);
