/**
 * Seed date characters into fresh database.
 * Images already exist in R2 bucket — this just creates the DB rows.
 * Run: npx tsx scripts/seed-dates.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const R2 = "https://r2.propertyrush.net/dates";

interface DateEntry {
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  style: "anime" | "realistic" | "fantasy" | "cyberpunk" | "casual";
  gender: "female" | "male";
  isStarter: boolean;
  priceCredits: number;
  personality: string;
  description: string;
  backstory: string;
  thumbnailUrl: string;
}

const DATES: DateEntry[] = [
  // ── FREE STARTERS (4) ───────────────────────────────────────────────
  {
    name: "Strawberry",
    rarity: "common",
    style: "anime",
    gender: "female",
    isStarter: true,
    priceCredits: 0,
    personality: "The Empress — glamorous, playful, always sipping",
    description: "The original PropertyRush icon",
    backstory: "A bubbly anime princess who wandered into a casino and never left. She thinks every card play is destiny.",
    thumbnailUrl: `${R2}/strawberry.gif`,
  },
  {
    name: "Lily Park",
    rarity: "common",
    style: "casual",
    gender: "female",
    isStarter: true,
    priceCredits: 0,
    personality: "The Bestie — supportive, relatable, casual reactions",
    description: "Your bestie who always has your back",
    backstory: "College roommate who got you into card games. She believes in you no matter what.",
    thumbnailUrl: `${R2}/lily-park.webp`,
  },
  {
    name: "Pixel",
    rarity: "common",
    style: "anime",
    gender: "female",
    isStarter: true,
    priceCredits: 0,
    personality: "The Gamer Girl — gaming references, competitive spirit, hype energy",
    description: "Gamer girl with competitive spirit",
    backstory: "Speedrunner who beat every card game AI. Now she coaches humans for fun.",
    thumbnailUrl: `${R2}/pixel.webp`,
  },
  {
    name: "Ruby Cole",
    rarity: "common",
    style: "cyberpunk",
    gender: "female",
    isStarter: true,
    priceCredits: 0,
    personality: "The Hype Queen — maximum energy, maximum volume",
    description: "The hype queen who never stops cheering",
    backstory: "Former extreme sports commentator. Got banned for being too loud. Your gain.",
    thumbnailUrl: `${R2}/ruby-cole.webp`,
  },

  // ── RARE (3 — 500 credits) ──────────────────────────────────────────
  {
    name: "Jasmine Santos",
    rarity: "rare",
    style: "casual",
    gender: "female",
    isStarter: false,
    priceCredits: 500,
    personality: "The Chill Queen — laid back, witty, never stressed",
    description: "The chill one with the sharp observations",
    backstory: "Coffee shop regular who turned out to be a secret card shark. Plays it cool, always.",
    thumbnailUrl: `${R2}/jasmine-santos.webp`,
  },
  {
    name: "Kai Nakamura",
    rarity: "rare",
    style: "anime",
    gender: "male",
    isStarter: false,
    priceCredits: 500,
    personality: "The Strategist — calm analysis, chess metaphors, quiet confidence",
    description: "Quiet genius who sees 3 moves ahead",
    backstory: "Former shogi champion from Osaka. Switched to card games because 'the chaos is more interesting.'",
    thumbnailUrl: `${R2}/kai-nakamura.webp`,
  },
  {
    name: "Nova",
    rarity: "rare",
    style: "fantasy",
    gender: "female",
    isStarter: false,
    priceCredits: 500,
    personality: "The Mystic — cryptic wisdom, astrology vibes, oddly accurate predictions",
    description: "Stargazer who reads your fate in the cards",
    backstory: "Claims she can read the future in shuffled decks. Scarily right about 60% of the time.",
    thumbnailUrl: `${R2}/nova.webp`,
  },

  // ── EPIC (3 — 2000 credits) ─────────────────────────────────────────
  {
    name: "Ryder Cole",
    rarity: "epic",
    style: "cyberpunk",
    gender: "male",
    isStarter: false,
    priceCredits: 2000,
    personality: "The Rebel — sarcastic, anti-authority, secretly caring",
    description: "Bad boy with a heart of gold",
    backstory: "Grew up hustling poker on the streets. Now he's your ride-or-die at the table.",
    thumbnailUrl: `${R2}/ryder-cole.webp`,
  },
  {
    name: "Scarlett Blaze",
    rarity: "epic",
    style: "fantasy",
    gender: "female",
    isStarter: false,
    priceCredits: 2000,
    personality: "The Femme Fatale — dramatic, confident, loves chaos",
    description: "She lives for the drama of a close game",
    backstory: "Ex-spy turned card game addict. Everything is a mission, and you're her partner.",
    thumbnailUrl: `${R2}/scarlett-blaze.webp`,
  },
  {
    name: "Zephyr",
    rarity: "epic",
    style: "cyberpunk",
    gender: "male",
    isStarter: false,
    priceCredits: 2000,
    personality: "The Hacker — tech references, data-driven, sees patterns in everything",
    description: "He ran the numbers. You're going to win.",
    backstory: "Built an AI to predict card games. It failed, so he decided to watch humans play instead.",
    thumbnailUrl: `${R2}/zephyr.webp`,
  },

  // ── LEGENDARY (2 — 5000 credits) ────────────────────────────────────
  {
    name: "Aurora",
    rarity: "legendary",
    style: "fantasy",
    gender: "female",
    isStarter: false,
    priceCredits: 5000,
    personality: "The Goddess — ethereal, poetic, makes everything feel epic",
    description: "Every game feels like a mythic saga with her",
    backstory: "An ancient spirit who manifests wherever fortunes are won and lost. She chose you.",
    thumbnailUrl: `${R2}/aurora.webp`,
  },
  {
    name: "Ace Diamond",
    rarity: "legendary",
    style: "realistic",
    gender: "male",
    isStarter: false,
    priceCredits: 5000,
    personality: "The High Roller — suave, confident, casino royale energy",
    description: "The luckiest man alive. He swears it's skill.",
    backstory: "Won the Monte Carlo Championship three times. Retired to coach — but only the worthy.",
    thumbnailUrl: `${R2}/ace-diamond.webp`,
  },
];

async function main() {
  console.log("=== Seeding Date Characters ===\n");

  let created = 0;
  let skipped = 0;

  for (const d of DATES) {
    try {
      await db.insert(schema.girlfriends).values({
        name: d.name,
        rarity: d.rarity,
        modelUrl: "", // no 3D models anymore
        thumbnailUrl: d.thumbnailUrl,
        priceCredits: d.priceCredits,
        style: d.style,
        gender: d.gender,
        isStarter: d.isStarter,
        description: d.description,
        personality: d.personality,
        backstory: d.backstory,
      });
      const tag = d.isStarter ? "FREE" : `${d.priceCredits}cr`;
      const rarityColor = { common: "⚪", rare: "🔵", epic: "🟣", legendary: "🟡" }[d.rarity];
      console.log(`  ${rarityColor} ${d.name} (${d.rarity}, ${d.gender}, ${tag})`);
      created++;
    } catch (err: any) {
      if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
        console.log(`  ⏩ ${d.name} — already exists`);
        skipped++;
      } else {
        console.error(`  ❌ ${d.name} — ${err.message}`);
      }
    }
  }

  console.log(`\n=== Done! Created: ${created}, Skipped: ${skipped} ===`);
}

main().catch(console.error);
