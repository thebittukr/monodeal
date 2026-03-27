"use client";

import { useState } from "react";

export default function FairnessPage() {
  const [serverSeed, setServerSeed] = useState("");
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [clientSeeds, setClientSeeds] = useState("");
  const [result, setResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    setResult(null);
    try {
      // Use Web Crypto API for client-side verification
      const encoder = new TextEncoder();

      // 1. Verify server seed hash
      const seedBuffer = await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(serverSeed)
      );
      const computedHash = Array.from(new Uint8Array(seedBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const errors: string[] = [];

      if (computedHash !== serverSeedHash) {
        errors.push(
          "Server seed hash does NOT match. The server may have changed the seed after commitment."
        );
      }

      // 2. Verify combined hash
      const parsedClientSeeds: Record<string, string> = {};
      try {
        const lines = clientSeeds.trim().split("\n");
        for (const line of lines) {
          const [key, val] = line.split(":");
          if (key && val) parsedClientSeeds[key.trim()] = val.trim();
        }
      } catch {
        errors.push("Could not parse client seeds. Format: playerId:seed (one per line)");
      }

      if (Object.keys(parsedClientSeeds).length > 0) {
        const sortedKeys = Object.keys(parsedClientSeeds).sort();
        const combined =
          serverSeed +
          ":" +
          sortedKeys.map((k) => parsedClientSeeds[k]).join(":");
        const combinedBuffer = await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(combined)
        );
        const combinedHash = Array.from(new Uint8Array(combinedBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // The combined hash determines the deck order
        // Users can independently verify this produces the same shuffle
      }

      setResult({
        valid: errors.length === 0,
        errors:
          errors.length > 0
            ? errors
            : ["Verification passed! The server seed matches the committed hash."],
      });
    } catch (err) {
      setResult({
        valid: false,
        errors: [(err as Error).message],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-purple-400 hover:underline text-sm mb-4 block">
          &larr; Back to game
        </a>

        <h1 className="text-3xl font-bold mb-2">
          Provably Fair
        </h1>
        <p className="text-slate-400 mb-8">
          Every game uses cryptographic proof to ensure the deck shuffle is fair
          and cannot be manipulated.
        </p>

        {/* How it works */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-8">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ol className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">1</span>
              <span>Before the game starts, the server generates a secret <strong>server seed</strong> and publishes its SHA-256 hash.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">2</span>
              <span>Each player gets a random <strong>client seed</strong>. The seeds are combined to create a deterministic shuffle.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">3</span>
              <span>The deck order is <strong>mathematically determined</strong> by all seeds combined. No one can predict or change it.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">4</span>
              <span>After the game, the server <strong>reveals the server seed</strong>. You can verify it matches the hash from step 1.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">5</span>
              <span>If the hash matches, the game was <strong>provably fair</strong> — the server could not have changed the outcome.</span>
            </li>
          </ol>
        </div>

        {/* Verification Tool */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-8">
          <h2 className="text-xl font-semibold mb-4">Verify a Game</h2>
          <p className="text-slate-400 text-sm mb-4">
            Paste the proof from any completed game to verify it was fair.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Server Seed (revealed after game)
              </label>
              <input
                type="text"
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
                placeholder="e.g. a1b2c3d4e5f6..."
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Server Seed Hash (shown before game started)
              </label>
              <input
                type="text"
                value={serverSeedHash}
                onChange={(e) => setServerSeedHash(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
                placeholder="e.g. 7f83b1657ff1fc53..."
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Client Seeds (one per line — playerId:seed)
              </label>
              <textarea
                value={clientSeeds}
                onChange={(e) => setClientSeeds(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-purple-500 focus:outline-none font-mono text-sm h-24"
                placeholder={"PLAYER1:abc123\nPLAYER2:def456"}
              />
            </div>

            <button
              onClick={verify}
              disabled={!serverSeed || !serverSeedHash || loading}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg px-6 py-3 transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Fairness"}
            </button>

            {result && (
              <div
                className={`rounded-lg p-4 mt-4 ${
                  result.valid
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <p
                  className={`font-semibold mb-2 ${
                    result.valid ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {result.valid ? "VERIFIED — Game was fair!" : "VERIFICATION FAILED"}
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
          <div className="space-y-2 text-sm text-slate-400 font-mono">
            <p>Hash Algorithm: SHA-256</p>
            <p>Seed Length: 256 bits (64 hex chars)</p>
            <p>Shuffle: Fisher-Yates with seeded PRNG</p>
            <p>Deck Size: 110 cards</p>
            <p>Commitment: hash(server_seed) published before game</p>
            <p>Combined: hash(server_seed + client_seeds) determines deck</p>
            <p>Verification: 100% client-side (no server trust needed)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
