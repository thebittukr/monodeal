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
        <p className="text-slate-400 mb-10">Your account, funds, and gameplay are protected by multiple layers of security.</p>

        <div className="space-y-8">

          {/* Provably Fair */}
          <Section title="Provably Fair Games">
            <p>Every game on PropertyRush uses a cryptographic commitment system to guarantee fairness. Before a game starts, the deck order is locked using a mathematical process that no one — not even us — can change after the fact.</p>
            <ul className="space-y-2 mt-3">
              <Bullet text="A cryptographic commitment is published before the game begins" />
              <Bullet text="After the game, the full proof is revealed so you can verify the outcome" />
              <Bullet text="The verification can be done independently — no trust required" />
            </ul>
            <a href="/fairness" className="inline-block mt-3 text-violet-400 hover:text-violet-300 text-sm transition">
              Learn more and verify any game &rarr;
            </a>
          </Section>

          {/* Fund Security */}
          <Section title="Fund Security">
            <p>We take the security of your funds seriously. Your credits and crypto are protected at every level.</p>
            <ul className="space-y-2 mt-3">
              <Bullet text="All wallet keys are encrypted using industry-standard encryption" />
              <Bullet text="Transactions are processed on the Polygon blockchain — transparent and verifiable" />
              <Bullet text="Large withdrawals require additional verification" />
              <Bullet text="Funds are distributed across secure storage to minimize risk" />
              <Bullet text="Every transaction is recorded with a complete audit trail" />
            </ul>
          </Section>

          {/* Anti-Cheat */}
          <Section title="Anti-Cheat & Fair Play">
            <p>We operate a continuous monitoring system that analyzes gameplay patterns to maintain a fair environment for all players.</p>
            <p className="mt-2">Our system detects and takes action against:</p>
            <ul className="space-y-2 mt-3">
              <Bullet text="Collusion — players working together to gain an unfair advantage" />
              <Bullet text="Automation — bots or scripts playing on behalf of a user" />
              <Bullet text="Multi-accounting — using multiple accounts to manipulate games" />
              <Bullet text="Any form of exploitation or abuse" />
            </ul>
            <p className="text-slate-500 text-xs mt-3">Enforcement actions range from warnings to permanent suspension, depending on severity. We continuously update our detection methods.</p>
          </Section>

          {/* Platform Security */}
          <Section title="Platform Security">
            <p>Our infrastructure is built with security as a foundation, not an afterthought.</p>
            <ul className="space-y-2 mt-3">
              <Bullet text="All inputs are strictly validated before processing" />
              <Bullet text="Rate limiting protects against abuse and spam" />
              <Bullet text="Sessions are secured with encrypted, HTTP-only cookies" />
              <Bullet text="Access is restricted to authorized origins only" />
              <Bullet text="We follow industry-standard security practices across our entire stack" />
            </ul>
          </Section>

          {/* Server Authority */}
          <Section title="Server-Authoritative Gameplay">
            <p>All game outcomes are processed securely on our servers. The game client displays the action, but cannot influence or manipulate results.</p>
            <ul className="space-y-2 mt-3">
              <Bullet text="Card dealing and shuffling happen entirely server-side" />
              <Bullet text="Every move is validated before it takes effect" />
              <Bullet text="Players only see information they are supposed to see" />
              <Bullet text="No client-side modification can affect game outcomes" />
            </ul>
          </Section>

          {/* Audit */}
          <Section title="Audit & Transparency">
            <p>We maintain detailed records of all platform activity to ensure accountability and support dispute resolution.</p>
            <ul className="space-y-2 mt-3">
              <Bullet text="All game actions are logged with timestamps" />
              <Bullet text="Financial transactions have a complete audit trail" />
              <Bullet text="Suspicious activity is flagged and reviewed" />
              <Bullet text="Logs are retained for compliance and dispute resolution" />
            </ul>
          </Section>

          {/* Reporting */}
          <Section title="Report an Issue">
            <p>If you believe a player is acting unfairly, or if you notice anything suspicious, please report it. Every report is reviewed by our team, and your identity is always kept confidential.</p>
          </Section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-600 text-xs">PropertyRush is committed to maintaining a secure and fair platform for all players.</p>
          <a href="/" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block transition">&larr; Back to game</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex gap-2 items-start text-slate-400 text-sm">
      <span className="text-emerald-400 mt-0.5 shrink-0">&#10003;</span>
      <span>{text}</span>
    </li>
  );
}
