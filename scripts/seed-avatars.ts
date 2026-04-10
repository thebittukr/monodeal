/**
 * Avatar Seed Script — populates gamerAvatars table + assigns random to bots
 * Images already in public/avatars/ as WebP.
 * Run: npx tsx scripts/seed-avatars.ts
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient, { schema });

// File order matches sorted PNG filenames → avatar-01.webp through avatar-64.webp
// Ethnicity-appropriate names per group of 4
const AVATARS: Array<{
  name: string;
  category: "casino" | "action" | "fantasy" | "tech" | "style";
  isFree: boolean;
  priceCredits: number;
}> = [
  // 1-4: Chinese female
  { name: "Mei Lin", category: "style", isFree: true, priceCredits: 0 },
  { name: "Xiao Yue", category: "style", isFree: true, priceCredits: 0 },
  { name: "Ling Wei", category: "style", isFree: false, priceCredits: 100 },
  { name: "Zhi Ruo", category: "style", isFree: false, priceCredits: 100 },

  // 5-8: Western male (generic game)
  { name: "Marcus Cole", category: "casino", isFree: true, priceCredits: 0 },
  { name: "Vincent Gray", category: "casino", isFree: true, priceCredits: 0 },
  { name: "Theodore Banks", category: "casino", isFree: false, priceCredits: 100 },
  { name: "Charles Reed", category: "casino", isFree: false, priceCredits: 100 },

  // 9-12: Arabic male
  { name: "Omar Al-Rashid", category: "action", isFree: true, priceCredits: 0 },
  { name: "Hassan Khalil", category: "action", isFree: true, priceCredits: 0 },
  { name: "Tariq Mahmoud", category: "action", isFree: false, priceCredits: 100 },
  { name: "Khalid Nasser", category: "action", isFree: false, priceCredits: 100 },

  // 13-16: Arabic female
  { name: "Layla Farid", category: "style", isFree: true, priceCredits: 0 },
  { name: "Amira Sayeed", category: "style", isFree: true, priceCredits: 0 },
  { name: "Fatima Zara", category: "style", isFree: false, priceCredits: 100 },
  { name: "Zahra Habib", category: "style", isFree: false, priceCredits: 100 },

  // 17-20: Asian male (Japanese/Korean)
  { name: "Takeshi Mori", category: "tech", isFree: false, priceCredits: 100 },
  { name: "Kenji Hayashi", category: "tech", isFree: false, priceCredits: 100 },
  { name: "Haruto Sato", category: "tech", isFree: false, priceCredits: 150 },
  { name: "Riku Tanaka", category: "tech", isFree: false, priceCredits: 150 },

  // 21-24: Asian female
  { name: "Yuki Nakamura", category: "style", isFree: false, priceCredits: 100 },
  { name: "Hana Kimura", category: "style", isFree: false, priceCredits: 100 },
  { name: "Sakura Ito", category: "style", isFree: false, priceCredits: 150 },
  { name: "Aiko Watanabe", category: "style", isFree: false, priceCredits: 150 },

  // 25-28: Black American male
  { name: "Dwayne Carter", category: "action", isFree: false, priceCredits: 100 },
  { name: "Marcus Johnson", category: "action", isFree: false, priceCredits: 100 },
  { name: "Terrence Williams", category: "action", isFree: false, priceCredits: 150 },
  { name: "Andre Davis", category: "action", isFree: false, priceCredits: 150 },

  // 29-32: Black American female
  { name: "Aaliyah Brown", category: "style", isFree: false, priceCredits: 100 },
  { name: "Destiny Jones", category: "style", isFree: false, priceCredits: 100 },
  { name: "Jasmine Brooks", category: "style", isFree: false, priceCredits: 150 },
  { name: "Keisha Taylor", category: "style", isFree: false, priceCredits: 150 },

  // 33-36: Chinese male
  { name: "Wei Chen", category: "casino", isFree: false, priceCredits: 150 },
  { name: "Liu Yang", category: "casino", isFree: false, priceCredits: 150 },
  { name: "Zhang Hao", category: "casino", isFree: false, priceCredits: 200 },
  { name: "Wang Jun", category: "casino", isFree: false, priceCredits: 200 },

  // 37-40: Western female
  { name: "Victoria Blake", category: "style", isFree: false, priceCredits: 150 },
  { name: "Sophia Hart", category: "style", isFree: false, priceCredits: 150 },
  { name: "Elena Cross", category: "style", isFree: false, priceCredits: 200 },
  { name: "Isabella Quinn", category: "style", isFree: false, priceCredits: 200 },

  // 41-44: Indian male
  { name: "Raj Patel", category: "casino", isFree: false, priceCredits: 150 },
  { name: "Arjun Sharma", category: "casino", isFree: false, priceCredits: 150 },
  { name: "Vikram Singh", category: "casino", isFree: false, priceCredits: 200 },
  { name: "Rohan Mehta", category: "casino", isFree: false, priceCredits: 200 },

  // 45-48: Latin male
  { name: "Carlos Rivera", category: "action", isFree: false, priceCredits: 200 },
  { name: "Diego Santos", category: "action", isFree: false, priceCredits: 200 },
  { name: "Rafael Moreno", category: "action", isFree: false, priceCredits: 250 },
  { name: "Miguel Torres", category: "action", isFree: false, priceCredits: 250 },

  // 49-52: Latin female
  { name: "Maria Gonzalez", category: "style", isFree: false, priceCredits: 200 },
  { name: "Valentina Reyes", category: "style", isFree: false, priceCredits: 200 },
  { name: "Camila Herrera", category: "style", isFree: false, priceCredits: 250 },
  { name: "Lucia Vargas", category: "style", isFree: false, priceCredits: 250 },

  // 53-56: European male
  { name: "Lars Eriksen", category: "casino", isFree: false, priceCredits: 200 },
  { name: "Sebastian Wolff", category: "casino", isFree: false, priceCredits: 200 },
  { name: "Henrik Johansson", category: "casino", isFree: false, priceCredits: 250 },
  { name: "Matteo Rossi", category: "casino", isFree: false, priceCredits: 250 },

  // 57-60: Russian male
  { name: "Dmitri Volkov", category: "action", isFree: false, priceCredits: 250 },
  { name: "Nikolai Petrov", category: "action", isFree: false, priceCredits: 250 },
  { name: "Sergei Ivanov", category: "action", isFree: false, priceCredits: 300 },
  { name: "Alexei Kozlov", category: "action", isFree: false, priceCredits: 300 },

  // 61-64: Russian female
  { name: "Natasha Sokolov", category: "style", isFree: false, priceCredits: 250 },
  { name: "Katya Romanova", category: "style", isFree: false, priceCredits: 250 },
  { name: "Svetlana Orlova", category: "style", isFree: false, priceCredits: 300 },
  { name: "Olga Kuznetsova", category: "style", isFree: false, priceCredits: 300 },
];

async function main() {
  console.log("=== Seeding 64 Avatars ===\n");

  // Clear existing avatars
  await db.delete(schema.gamerAvatars);
  console.log("Cleared existing avatars.\n");

  let freeCount = 0;
  let paidCount = 0;

  for (let i = 0; i < AVATARS.length; i++) {
    const av = AVATARS[i];
    const imageUrl = `/avatars/avatar-${String(i + 1).padStart(2, "0")}.webp`;

    await db.insert(schema.gamerAvatars).values({
      name: av.name,
      imageUrl,
      category: av.category,
      isFree: av.isFree,
      priceCredits: av.priceCredits,
    });

    const tag = av.isFree ? "FREE" : `${av.priceCredits}cr`;
    console.log(`  ${String(i + 1).padStart(2, " ")}. ${av.name.padEnd(22)} ${av.category.padEnd(8)} ${tag}`);
    if (av.isFree) freeCount++; else paidCount++;
  }

  // Assign random avatars to bots
  console.log("\nAssigning random avatars to bots...");
  const allAvatars = await db.select({ id: schema.gamerAvatars.id }).from(schema.gamerAvatars);
  const bots = await db.select({ id: schema.botProfiles.id, botId: schema.botProfiles.botId }).from(schema.botProfiles);

  for (const bot of bots) {
    const randomIdx = Math.floor(Math.random() * allAvatars.length);
    // botProfiles.avatarId is integer, but we'll store a number 1-64
    await db.update(schema.botProfiles)
      .set({ avatarId: randomIdx + 1 })
      .where(eq(schema.botProfiles.id, bot.id));
  }
  console.log(`  Assigned random avatars to ${bots.length} bots.`);

  console.log(`\n=== Done! Free: ${freeCount}, Paid: ${paidCount}, Total: ${AVATARS.length} ===`);
}

main().catch(console.error);
