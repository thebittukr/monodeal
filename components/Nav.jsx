"use client";
import { useAuth, clearAuthCache } from "@/lib/useAuth";
import { useState } from "react";

export default function Nav() {
  const { user, profile, credits, isAdmin, avatarUrl, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  async function handleSignOut() {
    try {
      clearAuthCache(); // Clear cache immediately for instant UI update
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/5 bg-slate-950/90 backdrop-blur-md">
      <a href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white">P</div>
        <span className="text-white font-bold text-base hidden sm:block">Property<span className="text-violet-400">Rush</span></span>
      </a>

      <div className="flex items-center gap-1 sm:gap-2">
        {isAdmin ? (
          <a href="/admin" className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold transition hover:bg-red-600/30">
            Admin
          </a>
        ) : (
          <>
            {/* Desktop nav links */}
            <NavLink href="/cards">Cards</NavLink>
            <NavLink href="/leaderboard">Ranks</NavLink>
            <NavLink href="/partners">Dates</NavLink>
            {user && (
              <>
                <NavLink href="/credits">Credits{credits ? ` (${credits.balance})` : ""}</NavLink>
                <NavLink href="/wallet">Wallet</NavLink>
              </>
            )}
            <NavLink href="/fairness">Fair</NavLink>
          </>
        )}

        {/* Auth section — works on both mobile and desktop */}
        {loading ? (
          <div className="w-14 h-7 rounded-full bg-white/5 animate-pulse ml-1" />
        ) : user ? (
          <div className="relative ml-1">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 transition text-xs"
            >
              <img src={avatarUrl || "/avatar-default.webp"} alt="" className="w-5 h-5 rounded-full object-cover" />
              <span className="text-violet-300 font-medium hidden sm:block max-w-[80px] truncate">{profile?.username || user.name}</span>
              <span className="text-violet-500 text-[8px]">▼</span>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
                  {/* Mobile-only quick links */}
                  <div className="sm:hidden border-b border-white/5 pb-1 mb-1">
                    <a href="/cards" className="block px-4 py-2 text-xs text-slate-300 hover:bg-white/5">Cards</a>
                    <a href="/leaderboard" className="block px-4 py-2 text-xs text-slate-300 hover:bg-white/5">Leaderboard</a>
                    <a href="/partners" className="block px-4 py-2 text-xs text-slate-300 hover:bg-white/5">Dates</a>
                    <a href="/fairness" className="block px-4 py-2 text-xs text-slate-300 hover:bg-white/5">Fair Play</a>
                  </div>
                  <a href="/profile" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Profile & Stats</a>
                  <a href="/wallet" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Wallet</a>
                  <a href="/credits" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Credits</a>
                  <a href="/partners" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">My Dates</a>
                  <a href="/profile/security" className="block px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition">Security</a>
                  <div className="border-t border-white/5 my-1" />
                  <div className="px-4 py-1.5 text-[9px] text-slate-600 truncate">{user.email}</div>
                  <button onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition">
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Not logged in — show Sign In on both mobile and desktop */
          <a href="/login" className="ml-1 px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">
            Sign In
          </a>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children }) {
  return (
    <a href={href} className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-[11px] font-medium transition hidden sm:block">
      {children}
    </a>
  );
}
