"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authClient.signUp.email({ name, email, password });
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignup() {
    setError("");
    try {
      window.location.href = "/api/auth/google";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google signup failed");
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 80% 80%, rgba(120,60,220,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 20%, rgba(60,220,120,0.08) 0%, transparent 50%)"
      }} />

      {/* Left: Branding (desktop) */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 relative z-10 px-12">
        <div className="max-w-md">
          <h1 className="text-5xl font-black text-white leading-tight">
            Join the<br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Table</span>
          </h1>
          <p className="text-slate-400 text-lg mt-4 leading-relaxed">
            Create your account and start playing in seconds. Choose your girlfriend, climb the ranks, win credits.
          </p>
          <div className="flex items-center gap-3 mt-8">
            <div className="flex -space-x-2">
              {["bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"].map((c, i) => (
                <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-white`}>
                  {["A", "K", "Q", "J"][i]}
                </div>
              ))}
            </div>
            <span className="text-slate-500 text-sm">Join thousands of players</span>
          </div>
        </div>
      </div>

      {/* Right: Signup Form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-black text-white">
              Property<span className="text-violet-400">Rush</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">Create your account</p>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/8 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Create Account</h2>
            <p className="text-slate-500 text-sm mb-6">Start playing in seconds</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 mb-4 text-xs">{error}</div>
            )}

            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold rounded-xl px-4 py-3 hover:bg-slate-100 transition text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-slate-900/70 text-slate-600 text-[10px] uppercase tracking-widest">or</span></div>
            </div>

            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Display Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 border border-white/8 text-white rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition"
                  placeholder="Your gaming name" required maxLength={20}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/8 text-white rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition"
                  placeholder="you@example.com" required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/8 text-white rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition"
                  placeholder="Min 8 characters" required minLength={8}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl px-4 py-3 text-sm transition disabled:opacity-50 shadow-lg shadow-emerald-500/15"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>

            <p className="text-slate-600 text-center text-xs mt-5">
              Already playing?{" "}
              <a href="/login" className="text-violet-400 hover:text-violet-300 transition">Sign in</a>
            </p>
          </div>

          <a href="/" className="block text-center text-slate-600 hover:text-slate-400 text-xs mt-4 transition">
            &larr; Back to game
          </a>
        </div>
      </div>
    </div>
  );
}
