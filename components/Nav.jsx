"use client";
import { useAuth } from "@/lib/useAuth";

export default function Nav() {
  const { user, profile, credits, loading } = useAuth();

  return (
    <nav className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
      <a href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white">P</div>
        <span className="text-white font-bold text-lg hidden sm:block">Property<span className="text-violet-400">Rush</span></span>
      </a>
      <div className="flex items-center gap-1 sm:gap-2">
        <NavLink href="/cards">Cards</NavLink>
        <NavLink href="/leaderboard">Ranks</NavLink>
        <NavLink href="/partners">Dates</NavLink>

        {user && (
          <>
            <NavLink href="/credits">
              Credits{credits ? ` (${credits.balance})` : ""}
            </NavLink>
            <NavLink href="/profile">Profile</NavLink>
          </>
        )}

        <NavLink href="/fairness">Fair Play</NavLink>

        {loading ? (
          <div className="w-16 h-7 rounded-full bg-white/5 animate-pulse ml-2" />
        ) : user ? (
          <a href="/profile" className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 transition text-xs">
            <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white">
              {(profile?.username || user.name || "?")[0].toUpperCase()}
            </div>
            <span className="text-violet-300 font-medium hidden sm:block">{profile?.username || user.name}</span>
          </a>
        ) : (
          <a href="/login" className="ml-2 px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">
            Sign In
          </a>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children }) {
  return (
    <a href={href} className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-medium transition hidden sm:block">
      {children}
    </a>
  );
}
