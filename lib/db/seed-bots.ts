/**
 * Seed 100 platform bots with realistic names, countries, and personalities.
 * Run with: npx tsx lib/db/seed-bots.ts
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ── Bot definitions ──────────────────────────────────────────────────────────

interface BotDef {
  displayName: string;
  countryCode: string;
  personality: "aggressive" | "cautious" | "balanced" | "strategic" | "unpredictable";
  eloRating: number;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
}

const BOTS: BotDef[] = [
  // ── USA (20) ───────────────────────────────────────────────────────────────
  { displayName: "Jake_TX", countryCode: "US", personality: "aggressive", eloRating: 1450, tier: "gold" },
  { displayName: "MiaBee", countryCode: "US", personality: "strategic", eloRating: 1650, tier: "platinum" },
  { displayName: "ChicagoColt", countryCode: "US", personality: "balanced", eloRating: 1200, tier: "silver" },
  { displayName: "NYCQueen", countryCode: "US", personality: "aggressive", eloRating: 1850, tier: "diamond" },
  { displayName: "SunnyCA", countryCode: "US", personality: "cautious", eloRating: 950, tier: "bronze" },
  { displayName: "MaverickATL", countryCode: "US", personality: "unpredictable", eloRating: 1350, tier: "gold" },
  { displayName: "BlazeFL", countryCode: "US", personality: "aggressive", eloRating: 1100, tier: "silver" },
  { displayName: "LunaVegas", countryCode: "US", personality: "strategic", eloRating: 1550, tier: "platinum" },
  { displayName: "CooperMI", countryCode: "US", personality: "balanced", eloRating: 880, tier: "bronze" },
  { displayName: "SkyeWA", countryCode: "US", personality: "cautious", eloRating: 1020, tier: "bronze" },
  { displayName: "RileyOR", countryCode: "US", personality: "balanced", eloRating: 1250, tier: "silver" },
  { displayName: "AceBoston", countryCode: "US", personality: "aggressive", eloRating: 1400, tier: "gold" },
  { displayName: "DakotaWY", countryCode: "US", personality: "cautious", eloRating: 900, tier: "bronze" },
  { displayName: "PhoenixAZ", countryCode: "US", personality: "unpredictable", eloRating: 1300, tier: "gold" },
  { displayName: "BrooklynJ", countryCode: "US", personality: "strategic", eloRating: 1700, tier: "platinum" },
  { displayName: "TexasHold", countryCode: "US", personality: "aggressive", eloRating: 1500, tier: "platinum" },
  { displayName: "MiamiVice", countryCode: "US", personality: "unpredictable", eloRating: 1150, tier: "silver" },
  { displayName: "SeattleRain", countryCode: "US", personality: "cautious", eloRating: 1050, tier: "bronze" },
  { displayName: "DenverHigh", countryCode: "US", personality: "balanced", eloRating: 1180, tier: "silver" },
  { displayName: "NashTune", countryCode: "US", personality: "strategic", eloRating: 1380, tier: "gold" },

  // ── India (12) ─────────────────────────────────────────────────────────────
  { displayName: "ArjunAce", countryCode: "IN", personality: "strategic", eloRating: 1600, tier: "platinum" },
  { displayName: "PriyaWins", countryCode: "IN", personality: "balanced", eloRating: 1250, tier: "silver" },
  { displayName: "RohitKing", countryCode: "IN", personality: "aggressive", eloRating: 1400, tier: "gold" },
  { displayName: "AnanyaGo", countryCode: "IN", personality: "cautious", eloRating: 980, tier: "bronze" },
  { displayName: "VikramPro", countryCode: "IN", personality: "strategic", eloRating: 1500, tier: "platinum" },
  { displayName: "DivyaStar", countryCode: "IN", personality: "unpredictable", eloRating: 1150, tier: "silver" },
  { displayName: "KaranBoss", countryCode: "IN", personality: "aggressive", eloRating: 1350, tier: "gold" },
  { displayName: "NehaRush", countryCode: "IN", personality: "balanced", eloRating: 1080, tier: "bronze" },
  { displayName: "AadiDev", countryCode: "IN", personality: "cautious", eloRating: 920, tier: "bronze" },
  { displayName: "IshaCards", countryCode: "IN", personality: "strategic", eloRating: 1450, tier: "gold" },
  { displayName: "RajDeals", countryCode: "IN", personality: "aggressive", eloRating: 1200, tier: "silver" },
  { displayName: "MeeraPick", countryCode: "IN", personality: "balanced", eloRating: 1100, tier: "silver" },

  // ── Brazil (10) ────────────────────────────────────────────────────────────
  { displayName: "LucasBR", countryCode: "BR", personality: "aggressive", eloRating: 1300, tier: "gold" },
  { displayName: "GabiCards", countryCode: "BR", personality: "balanced", eloRating: 1100, tier: "silver" },
  { displayName: "PedroRush", countryCode: "BR", personality: "unpredictable", eloRating: 1450, tier: "gold" },
  { displayName: "BrunaAce", countryCode: "BR", personality: "strategic", eloRating: 1550, tier: "platinum" },
  { displayName: "ThiagoSP", countryCode: "BR", personality: "aggressive", eloRating: 950, tier: "bronze" },
  { displayName: "LaraRJ", countryCode: "BR", personality: "cautious", eloRating: 1050, tier: "bronze" },
  { displayName: "MateusPro", countryCode: "BR", personality: "balanced", eloRating: 1200, tier: "silver" },
  { displayName: "JuliaBH", countryCode: "BR", personality: "strategic", eloRating: 1380, tier: "gold" },
  { displayName: "FelipeFLA", countryCode: "BR", personality: "aggressive", eloRating: 1150, tier: "silver" },
  { displayName: "CamilaSul", countryCode: "BR", personality: "cautious", eloRating: 880, tier: "bronze" },

  // ── Indonesia (8) ──────────────────────────────────────────────────────────
  { displayName: "RizkyPro", countryCode: "ID", personality: "balanced", eloRating: 1200, tier: "silver" },
  { displayName: "PutriGO", countryCode: "ID", personality: "strategic", eloRating: 1400, tier: "gold" },
  { displayName: "AndiWin", countryCode: "ID", personality: "aggressive", eloRating: 1100, tier: "silver" },
  { displayName: "DewiStar", countryCode: "ID", personality: "cautious", eloRating: 950, tier: "bronze" },
  { displayName: "BudiJKT", countryCode: "ID", personality: "unpredictable", eloRating: 1300, tier: "gold" },
  { displayName: "SariCards", countryCode: "ID", personality: "balanced", eloRating: 1050, tier: "bronze" },
  { displayName: "DimasBali", countryCode: "ID", personality: "aggressive", eloRating: 1350, tier: "gold" },
  { displayName: "NinaID", countryCode: "ID", personality: "strategic", eloRating: 1500, tier: "platinum" },

  // ── UK (7) ─────────────────────────────────────────────────────────────────
  { displayName: "OliverW", countryCode: "GB", personality: "strategic", eloRating: 1550, tier: "platinum" },
  { displayName: "SophieLDN", countryCode: "GB", personality: "balanced", eloRating: 1250, tier: "silver" },
  { displayName: "JackCards", countryCode: "GB", personality: "aggressive", eloRating: 1400, tier: "gold" },
  { displayName: "EmmaMCR", countryCode: "GB", personality: "cautious", eloRating: 1000, tier: "bronze" },
  { displayName: "HarryBRM", countryCode: "GB", personality: "unpredictable", eloRating: 1300, tier: "gold" },
  { displayName: "ChloeLDS", countryCode: "GB", personality: "balanced", eloRating: 1150, tier: "silver" },
  { displayName: "GeorgeEDN", countryCode: "GB", personality: "strategic", eloRating: 1700, tier: "platinum" },

  // ── Philippines (6) ────────────────────────────────────────────────────────
  { displayName: "MarcPH", countryCode: "PH", personality: "aggressive", eloRating: 1200, tier: "silver" },
  { displayName: "JanellaAce", countryCode: "PH", personality: "strategic", eloRating: 1450, tier: "gold" },
  { displayName: "KarlMNL", countryCode: "PH", personality: "balanced", eloRating: 1050, tier: "bronze" },
  { displayName: "BellaCards", countryCode: "PH", personality: "cautious", eloRating: 920, tier: "bronze" },
  { displayName: "DanielCBU", countryCode: "PH", personality: "unpredictable", eloRating: 1350, tier: "gold" },
  { displayName: "AngelDVO", countryCode: "PH", personality: "aggressive", eloRating: 1100, tier: "silver" },

  // ── Mexico (6) ─────────────────────────────────────────────────────────────
  { displayName: "CarlosMX", countryCode: "MX", personality: "aggressive", eloRating: 1300, tier: "gold" },
  { displayName: "ValeriaRush", countryCode: "MX", personality: "strategic", eloRating: 1500, tier: "platinum" },
  { displayName: "DiegoGDL", countryCode: "MX", personality: "balanced", eloRating: 1100, tier: "silver" },
  { displayName: "SofiaCDMX", countryCode: "MX", personality: "cautious", eloRating: 950, tier: "bronze" },
  { displayName: "LuisMTY", countryCode: "MX", personality: "unpredictable", eloRating: 1250, tier: "silver" },
  { displayName: "FernandaTJ", countryCode: "MX", personality: "aggressive", eloRating: 1150, tier: "silver" },

  // ── Germany (5) ────────────────────────────────────────────────────────────
  { displayName: "MaxBerlin", countryCode: "DE", personality: "strategic", eloRating: 1600, tier: "platinum" },
  { displayName: "LenaDE", countryCode: "DE", personality: "balanced", eloRating: 1200, tier: "silver" },
  { displayName: "FelixHH", countryCode: "DE", personality: "cautious", eloRating: 1050, tier: "bronze" },
  { displayName: "HannahMUC", countryCode: "DE", personality: "aggressive", eloRating: 1400, tier: "gold" },
  { displayName: "TimKOLN", countryCode: "DE", personality: "unpredictable", eloRating: 1300, tier: "gold" },

  // ── Turkey (5) ─────────────────────────────────────────────────────────────
  { displayName: "EmreCards", countryCode: "TR", personality: "aggressive", eloRating: 1350, tier: "gold" },
  { displayName: "AylinTR", countryCode: "TR", personality: "balanced", eloRating: 1150, tier: "silver" },
  { displayName: "CanIST", countryCode: "TR", personality: "strategic", eloRating: 1500, tier: "platinum" },
  { displayName: "ElifAnk", countryCode: "TR", personality: "cautious", eloRating: 980, tier: "bronze" },
  { displayName: "BurakIZM", countryCode: "TR", personality: "unpredictable", eloRating: 1250, tier: "silver" },

  // ── Russia / Eastern Europe (5) ────────────────────────────────────────────
  { displayName: "DmitryMSK", countryCode: "RU", personality: "strategic", eloRating: 1700, tier: "platinum" },
  { displayName: "AnyaSPB", countryCode: "RU", personality: "aggressive", eloRating: 1400, tier: "gold" },
  { displayName: "NikolaPL", countryCode: "PL", personality: "balanced", eloRating: 1150, tier: "silver" },
  { displayName: "KaterynaUA", countryCode: "UA", personality: "cautious", eloRating: 1050, tier: "bronze" },
  { displayName: "MilanCZ", countryCode: "CZ", personality: "unpredictable", eloRating: 1300, tier: "gold" },

  // ── Japan (4) ──────────────────────────────────────────────────────────────
  { displayName: "YukiJP", countryCode: "JP", personality: "strategic", eloRating: 1550, tier: "platinum" },
  { displayName: "RenCards", countryCode: "JP", personality: "cautious", eloRating: 1100, tier: "silver" },
  { displayName: "HaruTKY", countryCode: "JP", personality: "balanced", eloRating: 1250, tier: "silver" },
  { displayName: "SakuraOSK", countryCode: "JP", personality: "aggressive", eloRating: 1400, tier: "gold" },

  // ── Nigeria (4) ────────────────────────────────────────────────────────────
  { displayName: "ChimaNG", countryCode: "NG", personality: "aggressive", eloRating: 1300, tier: "gold" },
  { displayName: "AdaWins", countryCode: "NG", personality: "strategic", eloRating: 1450, tier: "gold" },
  { displayName: "EmekLAG", countryCode: "NG", personality: "balanced", eloRating: 1050, tier: "bronze" },
  { displayName: "NgoziABJ", countryCode: "NG", personality: "unpredictable", eloRating: 1200, tier: "silver" },

  // ── South Korea (4) ────────────────────────────────────────────────────────
  { displayName: "MinhoKR", countryCode: "KR", personality: "strategic", eloRating: 1650, tier: "platinum" },
  { displayName: "SoyeonAce", countryCode: "KR", personality: "aggressive", eloRating: 1400, tier: "gold" },
  { displayName: "JunhoSEO", countryCode: "KR", personality: "balanced", eloRating: 1200, tier: "silver" },
  { displayName: "HanaCards", countryCode: "KR", personality: "cautious", eloRating: 950, tier: "bronze" },

  // ── Other (4) ──────────────────────────────────────────────────────────────
  { displayName: "OmarEG", countryCode: "EG", personality: "aggressive", eloRating: 1250, tier: "silver" },
  { displayName: "LinaVN", countryCode: "VN", personality: "strategic", eloRating: 1350, tier: "gold" },
  { displayName: "SofiaAR", countryCode: "AR", personality: "unpredictable", eloRating: 1150, tier: "silver" },
  { displayName: "LeviET", countryCode: "ET", personality: "balanced", eloRating: 900, tier: "bronze" },
];

async function seed() {
  console.log(`Seeding ${BOTS.length} platform bots...`);

  let count = 0;
  for (const bot of BOTS) {
    const botId = `BOT_${String(count + 1).padStart(3, "0")}`;
    try {
      await db.insert(schema.botProfiles).values({
        botId,
        displayName: bot.displayName,
        countryCode: bot.countryCode,
        personality: bot.personality,
        eloRating: bot.eloRating,
        tier: bot.tier,
        avatarId: Math.floor(Math.random() * 100) + 1,
      }).onConflictDoNothing();
      const flag = countryFlag(bot.countryCode);
      console.log(`  ${flag} ${bot.displayName} (${bot.tier}, ${bot.personality}, ELO ${bot.eloRating})`);
      count++;
    } catch (err: unknown) {
      console.error(`  Failed: ${bot.displayName}`, (err as Error).message);
    }
  }

  console.log(`\nDone! ${count} bots seeded.`);
  console.log(`\nDistribution:`);
  const countries: Record<string, number> = {};
  for (const b of BOTS) {
    countries[b.countryCode] = (countries[b.countryCode] || 0) + 1;
  }
  Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, n]) => console.log(`  ${countryFlag(code)} ${code}: ${n}`));
}

function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

seed().catch(console.error);
