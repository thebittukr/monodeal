export default function ResponsibleGamingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black">P</div>
          <span className="text-white font-bold">Property<span className="text-violet-400">Rush</span></span>
        </a>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-black mb-2">Responsible Gaming</h1>
        <p className="text-slate-400 mb-10">We believe gaming should be fun, fair, and safe for everyone.</p>

        <div className="space-y-8">
          {/* Our Commitment */}
          <Section title="Our Commitment">
            <p>PropertyRush is a skill-based card game. We are committed to providing a safe, fair, and enjoyable experience. We actively implement systems to protect our players from harm and promote responsible play.</p>
          </Section>

          {/* Loss Protection */}
          <Section title="Automatic Loss Protection">
            <p>We have built-in safeguards that activate automatically to protect you:</p>
            <ul className="list-none space-y-3 mt-3">
              <Li icon="3" text="After 3 consecutive losses, you'll see a friendly reminder to stay mindful." />
              <Li icon="5" text="After 5 consecutive losses, we'll suggest you take a short break." />
              <Li icon="7" text="After 7 consecutive losses, a mandatory 10-minute cooldown activates. You can still play free rooms." />
              <Li icon="10" text="After 10 consecutive losses, a 1-hour cooldown activates." />
              <Li icon="20" text="After 20 consecutive losses, a 24-hour break is enforced for your protection." />
            </ul>
            <p className="text-slate-500 text-sm mt-3">Winning resets your streak. Free rooms are always available during cooldowns.</p>
          </Section>

          {/* Daily Limits */}
          <Section title="Daily Loss Limits">
            <p>Every player has a daily loss cap based on the stakes they play. Once you hit your daily limit, you can only play free rooms or come back the next day.</p>
            <div className="bg-slate-800/50 rounded-xl p-4 mt-3 font-mono text-sm text-slate-300">
              Daily limit = 5x your typical entry fee<br />
              Example: Playing 500-credit tables = 2,500 credit daily cap
            </div>
          </Section>

          {/* Fair Play Score */}
          <Section title="Fair Play Score">
            <p>Every player starts with a Fair Play Score of 100. This score reflects your standing in the community:</p>
            <ul className="list-none space-y-2 mt-3">
              <li className="text-slate-400 text-sm flex gap-2"><span className="text-emerald-400">90-100:</span> Excellent standing</li>
              <li className="text-slate-400 text-sm flex gap-2"><span className="text-yellow-400">70-89:</span> Good standing</li>
              <li className="text-slate-400 text-sm flex gap-2"><span className="text-orange-400">50-69:</span> Under review — may affect matchmaking</li>
              <li className="text-slate-400 text-sm flex gap-2"><span className="text-red-400">Below 50:</span> Restricted — lower stake tables only</li>
            </ul>
            <p className="text-slate-500 text-sm mt-3">Your score improves with clean, consistent play over time.</p>
          </Section>

          {/* Self-Exclusion */}
          <Section title="Self-Exclusion">
            <p>If you feel you need a longer break, you have options:</p>
            <ul className="list-none space-y-3 mt-3">
              <Li icon="1" text="Quick self-exclusion: Pause your account for 24 hours, 7 days, or 30 days directly from your settings. Instant, automated, no questions asked." />
              <Li icon="2" text="Extended exclusion: Submit a support ticket for 3-month, 6-month, or permanent account suspension. We process these within 24 hours." />
              <Li icon="3" text="During exclusion, you cannot play credit rooms, deposit, or withdraw. Free rooms remain accessible for casual play." />
            </ul>
            <p className="text-slate-500 text-xs mt-3">All self-exclusion requests are handled through our support system. Reversing a permanent exclusion requires a cooling-off period and review.</p>
          </Section>

          {/* Free Play */}
          <Section title="Free Rooms — Always Available">
            <p>PropertyRush always offers free rooms where no credits are required. Play for fun, practice strategies, or simply enjoy the game without any financial risk. Free rooms have no cooldowns or limits.</p>
          </Section>

          {/* Resources */}
          <Section title="Need Help?">
            <p>If you or someone you know is struggling with gaming habits, these resources can help:</p>
            <div className="space-y-2 mt-3">
              <Resource name="National Council on Problem Gambling" url="https://www.ncpgambling.org" />
              <Resource name="Gamblers Anonymous" url="https://www.gamblersanonymous.org" />
              <Resource name="BeGambleAware" url="https://www.begambleaware.org" />
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact Us">
            <p>Questions about our responsible gaming policies? Reach out to us anytime. We take player safety seriously and will respond promptly.</p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-slate-600 text-xs">PropertyRush is a skill-based card game. 18+ only. Play responsibly.</p>
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

function Li({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0">{icon}</span>
      <span className="text-slate-400 text-sm">{text}</span>
    </li>
  );
}

function Resource({ name, url }: { name: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-slate-800/40 rounded-xl px-4 py-3 text-sm text-violet-400 hover:text-violet-300 hover:bg-slate-800/60 transition border border-white/5">
      {name} &rarr;
    </a>
  );
}
