"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import Nav from "@/components/Nav";

export default function SecuritySettingsPage() {
  const { user, loading: authLoading } = useAuth();

  // ── Password State ────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // ── 2FA State ─────────────────────────────────────────────────────
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "recovery">("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [tfaMsg, setTfaMsg] = useState("");
  const [tfaErr, setTfaErr] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  // Fetch 2FA status
  useEffect(() => {
    if (user) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d.user?.totpEnabled !== undefined) setTwoFAEnabled(d.user.totpEnabled);
        })
        .catch(() => {});
    }
  }, [user]);

  // ── Password Change ───────────────────────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");

    if (newPw.length < 8) { setPwErr("Password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { setPwErr("Passwords do not match"); return; }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw || undefined, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error); setPwLoading(false); return; }
      setPwMsg(data.message || "Password updated!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch { setPwErr("Network error"); }
    setPwLoading(false);
  }

  // ── 2FA Setup ─────────────────────────────────────────────────────
  async function startSetup() {
    setTfaErr(""); setTfaMsg(""); setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setTfaErr(data.error); setTfaLoading(false); return; }
      setQrDataUrl(data.qrDataUrl);
      setTotpSecret(data.secret);
      setSetupStep("qr");
    } catch { setTfaErr("Network error"); }
    setTfaLoading(false);
  }

  async function verifySetup() {
    setTfaErr(""); setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: totpSecret, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) { setTfaErr(data.error); setTfaLoading(false); return; }
      setRecoveryCodes(data.recoveryCodes);
      setTwoFAEnabled(true);
      setSetupStep("recovery");
    } catch { setTfaErr("Network error"); }
    setTfaLoading(false);
  }

  async function disableTwoFA() {
    setTfaErr(""); setTfaMsg(""); setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) { setTfaErr(data.error); setTfaLoading(false); return; }
      setTwoFAEnabled(false);
      setShowDisable(false);
      setDisableCode("");
      setTfaMsg("Two-factor authentication disabled.");
    } catch { setTfaErr("Network error"); }
    setTfaLoading(false);
  }

  if (authLoading) return <div className="min-h-screen bg-slate-950" />;
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      <div className="max-w-lg mx-auto px-4 py-8 pt-20">
        <a href="/profile" className="text-sm text-slate-500 hover:text-slate-300 transition mb-4 inline-block">&larr; Back to Profile</a>
        <h1 className="text-2xl font-bold text-white mb-6">Account Security</h1>

        {/* ── Password Section ───────────────────────────────────────── */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
            <span className="text-lg">🔑</span> Password
          </h2>
          <p className="text-slate-500 text-xs mb-4">Update your password to keep your account secure.</p>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Current Password</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Leave blank if Google sign-in only"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">New Password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 8 characters" required minLength={8}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password" required
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
            </div>

            {pwErr && <p className="text-red-400 text-xs">{pwErr}</p>}
            {pwMsg && <p className="text-emerald-400 text-xs">{pwMsg}</p>}

            <button type="submit" disabled={pwLoading}
              className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm transition">
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* ── 2FA Section ────────────────────────────────────────────── */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
            <span className="text-lg">🛡️</span> Two-Factor Authentication
          </h2>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-4">
            {twoFAEnabled ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Enabled</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Disabled</span>
              </span>
            )}
          </div>

          {tfaMsg && <p className="text-emerald-400 text-xs mb-3">{tfaMsg}</p>}
          {tfaErr && <p className="text-red-400 text-xs mb-3">{tfaErr}</p>}

          {/* ── Not Enabled: Setup Flow ──────────────────────────────── */}
          {!twoFAEnabled && setupStep === "idle" && (
            <div>
              <p className="text-slate-500 text-xs mb-3">
                Add an extra layer of security by requiring a code from your authenticator app when signing in.
              </p>
              <button onClick={startSetup} disabled={tfaLoading}
                className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm transition">
                {tfaLoading ? "Setting up..." : "Enable 2FA"}
              </button>
            </div>
          )}

          {/* ── Step 1: QR Code ──────────────────────────────────────── */}
          {!twoFAEnabled && setupStep === "qr" && (
            <div>
              <p className="text-slate-400 text-xs mb-3">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
              </p>
              <div className="flex justify-center mb-3">
                <div className="bg-white rounded-xl p-3">
                  {qrDataUrl && <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />}
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 mb-4">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Manual entry key:</p>
                <p className="text-white font-mono text-xs break-all select-all">{totpSecret}</p>
              </div>
              <div className="flex gap-2">
                <input type="text" inputMode="numeric" value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="Enter 6-digit code" maxLength={6}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition" />
                <button onClick={verifySetup} disabled={tfaLoading || verifyCode.length < 6}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition">
                  {tfaLoading ? "..." : "Verify"}
                </button>
              </div>
              <button onClick={() => { setSetupStep("idle"); setTfaErr(""); }}
                className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition">Cancel</button>
            </div>
          )}

          {/* ── Step 2: Recovery Codes ────────────────────────────────── */}
          {setupStep === "recovery" && recoveryCodes.length > 0 && (
            <div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <p className="text-amber-300 text-xs font-bold mb-2">Save your recovery codes!</p>
                <p className="text-amber-400/70 text-[10px] mb-3">
                  These codes can be used to access your account if you lose your authenticator. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {recoveryCodes.map((code, i) => (
                    <div key={i} className="bg-black/30 rounded px-2 py-1 text-white font-mono text-xs text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join("\n")).catch(() => {});
                  setTfaMsg("Recovery codes copied to clipboard!");
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition mb-2"
              >
                Copy All Codes
              </button>
              <button onClick={() => { setSetupStep("idle"); setRecoveryCodes([]); }}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition">
                I&apos;ve saved my codes
              </button>
            </div>
          )}

          {/* ── Enabled: Disable Flow ────────────────────────────────── */}
          {twoFAEnabled && setupStep === "idle" && !showDisable && (
            <div>
              <p className="text-slate-500 text-xs mb-3">
                Your account is protected with two-factor authentication.
              </p>
              <button onClick={() => setShowDisable(true)}
                className="px-5 py-2.5 rounded-lg bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 font-bold text-sm transition">
                Disable 2FA
              </button>
            </div>
          )}

          {twoFAEnabled && showDisable && (
            <div>
              <p className="text-slate-400 text-xs mb-3">Enter your authenticator code or a recovery code to disable 2FA:</p>
              <div className="flex gap-2">
                <input type="text" value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="Code" maxLength={9}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition" />
                <button onClick={disableTwoFA} disabled={tfaLoading || !disableCode.trim()}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm transition">
                  {tfaLoading ? "..." : "Disable"}
                </button>
              </div>
              <button onClick={() => { setShowDisable(false); setDisableCode(""); setTfaErr(""); }}
                className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
