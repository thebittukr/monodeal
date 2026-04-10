"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"email" | "recovery">("email");

  // Recovery code fields
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);

  async function handleEmailReset(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setSent(true);
    } catch { setError("Network error"); }
    setLoading(false);
  }

  async function handleRecoveryReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-with-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, recoveryCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setResetDone(true);
    } catch { setError("Network error"); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">Reset Password</h1>
            <p className="text-slate-500 text-sm mt-1">Choose a reset method</p>
          </div>

          {/* Success — reset done via recovery */}
          {resetDone && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-emerald-400 text-sm mb-4">Password reset successfully!</p>
              <a href="/login" className="inline-block px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition">
                Sign In
              </a>
            </div>
          )}

          {/* Email sent confirmation */}
          {sent && !resetDone && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📧</span>
              </div>
              <p className="text-white text-sm font-medium mb-2">Check your email</p>
              <p className="text-slate-500 text-xs mb-4">
                If an account exists for <span className="text-slate-300">{email}</span>, we&apos;ve sent a reset link. Check your spam folder too.
              </p>
              <button onClick={() => { setSent(false); setEmail(""); }} className="text-xs text-violet-400 hover:text-violet-300 transition">
                Try a different email
              </button>
            </div>
          )}

          {/* Reset form */}
          {!sent && !resetDone && (
            <>
              {/* Method tabs */}
              <div className="flex rounded-xl bg-black/30 p-1 mb-5">
                <button onClick={() => { setMethod("email"); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${method === "email" ? "bg-violet-600 text-white" : "text-slate-500 hover:text-white"}`}>
                  Email Reset
                </button>
                <button onClick={() => { setMethod("recovery"); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${method === "recovery" ? "bg-violet-600 text-white" : "text-slate-500 hover:text-white"}`}>
                  Recovery Code
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 mb-4 text-xs">
                  {error}
                </div>
              )}

              {/* Email method */}
              {method === "email" && (
                <form onSubmit={handleEmailReset} className="space-y-3">
                  <p className="text-slate-500 text-xs mb-2">
                    Enter your email and we&apos;ll send you a link to reset your password.
                  </p>
                  <div>
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm transition">
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              )}

              {/* Recovery code method */}
              {method === "recovery" && (
                <form onSubmit={handleRecoveryReset} className="space-y-3">
                  <p className="text-slate-500 text-xs mb-2">
                    If you have 2FA enabled, use one of your recovery codes to reset your password.
                  </p>
                  <div>
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Recovery Code</label>
                    <input type="text" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="XXXX-XXXX" required maxLength={9}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters" required minLength={8}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password" required
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm transition">
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Back to login */}
          <div className="mt-5 text-center">
            <a href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition">
              &larr; Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
