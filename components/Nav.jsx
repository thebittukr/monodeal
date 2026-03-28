"use client";
import { useAuth } from "@/lib/useAuth";
import { useState } from "react";

export default function Nav() {
  const { user, profile, credits, isAdmin, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }

  return (
    <nav className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
      <a href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white">P</div>
        <span className="text-white font-bold text-lg hidden sm:block">Property<span className="text-violet-400">Rush</span></span>
      </a>
      <div className="flex items-center gap-1 sm:gap-2">
        {isAdmin ? (
          <>
            <a href="/admin" className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold transition hover:bg-red-600/30 hidden sm:block">
              Admin Dashboard
            </a>
          </>
        ) : (
          <>
            <NavLink href="/cards">Cards</NavLink>
            <NavLink href="/leaderboard">Ranks</NavLink>
            <NavLink href="/partners">Dates</NavLink>

            {user && (
              <>
                <NavLink href="/credits">
                  Credits{credits ? ` (${credits.balance})` : ""}
                </NavLink>
                <NavLink href="/wallet">Wallet</NavLink>
              </>
            )}

            <NavLink href="/fairness">Fair Play</NavLink>
          </>
        )}

        {loading ? (
          <div className="w-16 h-7 rounded-full bg-white/5 animate-pulse ml-2" />
        ) : user ? (
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 transition text-xs"
            >
              <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[9px] font-bold text-white">
                {(profile?.username || user.name || "?")[0].toUpperCase()}
              </div>
              <span className="text-violet-300 font-medium hidden sm:block">{profile?.username || user.name}</span>
              <span className="text-violet-500 text-[8px]">▼</span>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
                  <a href="/profile" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Profile & Stats</a>
                  <a href="/wallet" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Wallet</a>
                  <a href="/credits" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Credits</a>
                  <a href="/partners" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">My Dates</a>
                  <div className="border-t border-white/5 my-1" />
                  <div className="px-4 py-1.5 text-[9px] text-slate-600">{user.email}</div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
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
