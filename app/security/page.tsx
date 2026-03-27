export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black">P</div>
          <span className="text-white font-bold">Property<span className="text-violet-400">Rush</span></span>
        </a>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-black mb-2">Security</h1>
        <p className="text-slate-400 mb-10">How we protect your account, funds, and gameplay.</p>

        <div className="space-y-8">
          {/* Provably Fair */}
          <Section title="Provably Fair Games" icon="🔒">
            <p>Every game on PropertyRush uses cryptographic proof to ensure the deck shuffle is fair and cannot be manipulated by anyone — not even us.</p>
            <div className="bg-black/30 rounded-xl p-4 mt-3 space-y-2">
              <Step n="1" text="Before the game, the server generates a secret seed and publishes its SHA-256 hash" />
              <Step n="2" text="Each player receives a random client seed" />
              <Step n="3" text="All seeds are combined to deterministically shuffle the deck" />
              <Step n="4" text="After the game, the server seed is revealed so you can verify" />
            </div>
            <a href="/fairness" className="inline-block mt-3 text-violet-400 hover:text-violet-300 text-sm transition">
              Verify any game &rarr;
            </a>
          </Section>

          {/* Fund Security */}
          <Section title="Fund Security" icon="💰">
            <p>Your credits and crypto are protected with multiple layers of security:</p>
            <ul className="space-y-2 mt-3">
              <Feature text="Custodial wallets use encrypted private keys (AES-256)" />
              <Feature text="All transactions are on the Polygon blockchain — transparent and verifiable" />
              <Feature text="Withdrawal processing includes 2FA verification for large amounts" />
              <Feature text="Hot wallet holds minimal funds — bulk stored in cold storage" />
              <Feature text="Every transaction is logged with a full audit trail" />
            </ul>
          </Section>

          {/* Anti-Cheat */}
          <Section title="Anti-Cheat & Fraud Prevention" icon="🛡️">
            <p>We run a multi-layer fraud detection system that monitors every game in real time:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <FraudCard title="Collusion Detection" desc="We track player interactions across games. If two players repeatedly avoid attacking each other or funnel assets, our system flags it." />
              <FraudCard title="Bot Detection" desc="Move timing analysis detects inhuman response patterns. Suspiciously fast or perfectly consistent timing triggers review." />
              <FraudCard title="Multi-Account Detection" desc="Device fingerprinting and IP correlation identify players running multiple accounts in the same room." />
              <FraudCard title="Risk Scoring" desc="Every player has a dynamic risk score. Suspicious behavior increases it. High scores lead to restricted matchmaking or payouts." />
            </div>
            <p className="text-slate-500 text-xs mt-3">Important: We do NOT block players on same WiFi. Friends playing together is normal. We detect patterns over time, not single events.</p>
          </Section>

          {/* API Security */}
          <Section title="API & Infrastructure" icon="⚙️">
            <ul className="space-y-2">
              <Feature text="All inputs validated with strict schemas — zero trust architecture" />
              <Feature text="Per-player and per-IP rate limiting prevents spam and abuse" />
              <Feature text="Anti-replay system: every move has a unique ID, duplicates rejected" />
              <Feature text="Game state locking prevents race conditions on concurrent moves" />
              <Feature text="CORS enforcement restricts API access to authorized domains" />
              <Feature text="Session cookies are HTTP-only, signed, and auto-refreshed" />
            </ul>
          </Section>

          {/* Server Authority */}
          <Section title="Server-Authoritative Gameplay" icon="🎮">
            <p>The server is the single source of truth. The client is only a view.</p>
            <ul className="space-y-2 mt-3">
              <Feature text="All card dealing happens server-side" />
              <Feature text="Move validation happens server-side before execution" />
              <Feature text="Other players' hidden cards are NEVER sent to your client" />
              <Feature text="Game state is sanitized — internal data is stripped before delivery" />
            </ul>
          </Section>

          {/* Audit */}
          <Section title="Audit Trail" icon="📋">
            <p>Every action on the platform is logged:</p>
            <ul className="space-y-2 mt-3">
              <Feature text="All game moves with timestamps, IPs, and device info" />
              <Feature text="All credit transactions (deposits, withdrawals, winnings, rake)" />
              <Feature text="All fraud flags and risk score changes" />
              <Feature text="All authentication events (login, signup, 2FA)" />
            </ul>
            <p className="text-slate-500 text-xs mt-3">Logs are retained for dispute resolution and compliance.</p>
          </Section>

          {/* Reporting */}
          <Section title="Report Suspicious Activity" icon="🚨">
            <p>If you believe a player is cheating, colluding, or abusing the system, please report them. We investigate every report and take action when warranted.</p>
            <p className="text-slate-500 text-xs mt-2">We never disclose who reported whom. Your identity is protected.</p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-600 text-xs">PropertyRush takes security seriously. We continuously improve our systems.</p>
          <a href="/" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block transition">&larr; Back to game</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0">{n}</span>
      <span className="text-slate-400 text-sm">{text}</span>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex gap-2 items-start text-slate-400 text-sm">
      <span className="text-emerald-400 mt-0.5 shrink-0">&#10003;</span>
      <span>{text}</span>
    </li>
  );
}

function FraudCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-3">
      <div className="text-white text-xs font-bold mb-1">{title}</div>
      <div className="text-slate-500 text-[11px] leading-relaxed">{desc}</div>
    </div>
  );
}
