/**
 * Provably Fair RNG System
 *
 * Flow:
 * 1. Server generates a random server_seed before game starts
 * 2. Server publishes SHA-256(server_seed) to all players
 * 3. Each player optionally submits a client_seed
 * 4. Combined hash = SHA-256(server_seed + client_seed_1 + ... + client_seed_n)
 * 5. Deck order is deterministically derived from combined hash
 * 6. After game ends, server reveals server_seed
 * 7. Anyone can verify: SHA-256(revealed_seed) === published_hash
 * 8. Anyone can replay: same seeds → same deck → same outcome
 */

import { createHash, randomBytes } from "crypto";

// ── Seed Generation ──────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure server seed (256-bit hex).
 */
export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a seed with SHA-256 (for commitment — published before game).
 */
export function hashSeed(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/**
 * Combine server seed + all client seeds into a single deterministic hash.
 */
export function combineSeedsHash(
  serverSeed: string,
  clientSeeds: Record<string, string>
): string {
  // Sort client seeds by player ID for deterministic ordering
  const sortedKeys = Object.keys(clientSeeds).sort();
  const combined =
    serverSeed + ":" + sortedKeys.map((k) => clientSeeds[k]).join(":");
  return createHash("sha256").update(combined).digest("hex");
}

// ── Deterministic Shuffle (Fisher-Yates with seeded PRNG) ────────────────────

/**
 * Seeded PRNG using the combined hash as entropy source.
 * Uses a simple but deterministic approach: repeatedly hash to get random bytes.
 */
class SeededRNG {
  private state: string;
  private index: number;

  constructor(seed: string) {
    this.state = seed;
    this.index = 0;
  }

  /**
   * Get next random float [0, 1) — deterministic given the seed.
   */
  next(): number {
    const hash = createHash("sha256")
      .update(this.state + ":" + this.index)
      .digest("hex");
    this.index++;
    // Take first 8 hex chars (32 bits) and convert to float
    const value = parseInt(hash.slice(0, 8), 16);
    return value / 0x100000000; // divide by 2^32
  }

  /**
   * Get random integer in [0, max) — deterministic.
   */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Deterministic Fisher-Yates shuffle using seeded PRNG.
 * Given the same combinedHash, always produces the same order.
 */
export function deterministicShuffle<T>(
  items: T[],
  combinedHash: string
): T[] {
  const rng = new SeededRNG(combinedHash);
  const arr = [...items]; // don't mutate original

  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// ── Proof Object ─────────────────────────────────────────────────────────────

export interface FairnessProof {
  serverSeedHash: string; // published before game (commitment)
  serverSeed: string; // revealed after game
  clientSeeds: Record<string, string>; // player submissions
  combinedHash: string; // deterministic from all seeds
  deckOrder: number[]; // indices proving the shuffle
}

/**
 * Create the initial proof (before game starts).
 * Server seed is generated but NOT revealed yet — only the hash is shared.
 */
export function createGameProof(playerIds: string[]): {
  serverSeed: string;
  serverSeedHash: string;
  clientSeeds: Record<string, string>;
} {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashSeed(serverSeed);

  // Generate default client seeds for each player
  // Players can optionally override with their own
  const clientSeeds: Record<string, string> = {};
  for (const pid of playerIds) {
    clientSeeds[pid] = randomBytes(16).toString("hex");
  }

  return { serverSeed, serverSeedHash, clientSeeds };
}

/**
 * Finalize the proof and shuffle the deck.
 * Called when game starts (all players joined, seeds collected).
 */
export function finalizeAndShuffle<T>(
  serverSeed: string,
  clientSeeds: Record<string, string>,
  deck: T[]
): { shuffledDeck: T[]; combinedHash: string; deckOrder: number[] } {
  const combinedHash = combineSeedsHash(serverSeed, clientSeeds);
  const indices = deck.map((_, i) => i);
  const shuffledIndices = deterministicShuffle(indices, combinedHash);
  const shuffledDeck = shuffledIndices.map((i) => deck[i]);

  return {
    shuffledDeck,
    combinedHash,
    deckOrder: shuffledIndices,
  };
}

/**
 * Reveal and build the complete proof (after game ends).
 */
export function revealProof(
  serverSeed: string,
  serverSeedHash: string,
  clientSeeds: Record<string, string>,
  deckOrder: number[]
): FairnessProof {
  const combinedHash = combineSeedsHash(serverSeed, clientSeeds);
  return {
    serverSeedHash,
    serverSeed,
    clientSeeds,
    combinedHash,
    deckOrder,
  };
}

// ── Verification (client-side or server-side) ────────────────────────────────

/**
 * Verify a fairness proof. Anyone can run this.
 * Returns true if the proof is valid and the deck matches.
 */
export function verifyProof(proof: FairnessProof): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Verify server seed hash matches
  const computedHash = hashSeed(proof.serverSeed);
  if (computedHash !== proof.serverSeedHash) {
    errors.push(
      "Server seed hash mismatch — the server may have changed the seed"
    );
  }

  // 2. Verify combined hash
  const computedCombined = combineSeedsHash(
    proof.serverSeed,
    proof.clientSeeds
  );
  if (computedCombined !== proof.combinedHash) {
    errors.push("Combined hash mismatch — seeds don't match the stated hash");
  }

  // 3. Verify deck order is reproducible
  const indices = proof.deckOrder.map((_, i) => i);
  const reproduced = deterministicShuffle(indices, computedCombined);
  const deckMatch = reproduced.every((v, i) => v === proof.deckOrder[i]);
  if (!deckMatch) {
    errors.push("Deck order is not reproducible from the given seeds");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
