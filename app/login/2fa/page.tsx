"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const inputRef = useRef<HTMLInputElement>(null);

  // Get challenge token from cookie or URL
  useEffect(() => {
    // Try reading from cookie via a simple API call, or from URL search params
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("challenge");
    if (tokenParam) {
      setChallengeToken(tokenParam);
    } else {
      // Read from cookie by trying to get it from document.cookie
      const match = document.cookie.match(/2fa_challenge=([^;]+)/);
      if (match) {
        setChallengeToken(match[1]);
      }
    }
    inputRef.current?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !challengeToken) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      // Success — session cookie is set, redirect
      router.push("/");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const expired = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-xl font-bold text-white">Two-Factor Authentication</h1>
            <p className="text-slate-400 text-sm mt-1">
              {useRecovery
                ? "Enter a recovery code"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>

          {/* Timer */}
          {!expired && (
            <div className="text-center text-xs text-slate-500 mb-4">
              Code expires in{" "}
              <span className={`font-mono ${timeLeft < 60 ? "text-red-400" : "text-slate-400"}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          )}

          {expired ? (
            <div className="text-center">
              <p className="text-red-400 text-sm mb-4">Challenge expired. Please log in again.</p>
              <a
                href="/login"
                className="inline-block px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition"
              >
                Back to Login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                inputMode={useRecovery ? "text" : "numeric"}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={useRecovery ? "XXXX-XXXX" : "000000"}
                maxLength={useRecovery ? 9 : 6}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.3em] font-mono placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
              />

              {error && (
                <p className="text-red-400 text-xs text-center mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full mt-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm transition"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
          )}

          {/* Toggle recovery code */}
          {!expired && (
            <button
              onClick={() => {
                setUseRecovery(!useRecovery);
                setCode("");
                setError("");
              }}
              className="w-full mt-3 text-center text-xs text-slate-500 hover:text-violet-400 transition"
            >
              {useRecovery ? "Use authenticator code instead" : "Use a recovery code"}
            </button>
          )}

          {/* Back to login */}
          <div className="mt-4 text-center">
            <a href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition">
              Cancel and go back
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
