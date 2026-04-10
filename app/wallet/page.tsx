"use client";

import { useState, useEffect, useRef } from "react";
import Nav from "@/components/Nav";
import QRCode from "qrcode";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"info" | "success" | "error">("info");
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [has2FA, setHas2FA] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // QR code
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Deposit polling
  const [depositPolling, setDepositPolling] = useState(false);
  const [depositChecking, setDepositChecking] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/wallet").then(r => r.json()),
      fetch("/api/credits").then(r => r.json()),
      fetch("/api/profile").then(r => r.json()),
    ]).then(([w, c, p]) => {
      setWallet(w);
      setBalance(c.balance);
      setHas2FA(p?.user?.totpEnabled || false);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Generate QR code when wallet address is available
  useEffect(() => {
    if (wallet?.custodial?.address) {
      QRCode.toDataURL(wallet.custodial.address, {
        width: 200, margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [wallet?.custodial?.address]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  function showMsg(text: string, type: "info" | "success" | "error" = "info") {
    setMsg(text); setMsgType(type);
    if (type !== "info") setTimeout(() => setMsg(""), 5000);
  }

  async function checkDeposit() {
    setDepositChecking(true);
    try {
      const res = await fetch("/api/wallet/check-deposit", { method: "POST" });
      const data = await res.json();
      if (data.found && data.creditsAdded) {
        showMsg(`Deposit found! +${data.creditsAdded} credits (${data.amount} ${data.token})`, "success");
        // Refresh balance
        const c = await fetch("/api/credits").then(r => r.json());
        setBalance(c.balance);
        // Stop polling after successful deposit
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        setDepositPolling(false);
      } else {
        showMsg("No deposits found yet", "info");
      }
    } catch {
      showMsg("Failed to check deposits", "error");
    }
    setDepositChecking(false);
  }

  function toggleDepositPolling() {
    if (depositPolling) {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      setDepositPolling(false);
      showMsg("Auto-check stopped", "info");
    } else {
      setDepositPolling(true);
      showMsg("Auto-checking every 15 seconds...", "info");
      checkDeposit(); // check immediately
      pollIntervalRef.current = setInterval(checkDeposit, 15000);
    }
  }

  async function handleWithdraw() {
    setMsg("");
    const credits = parseInt(withdrawAmount);
    if (isNaN(credits) || credits < 500) { showMsg("Minimum 500 credits (5 USDT)", "error"); return; }

    const toAddr = wallet?.external?.address;
    if (!toAddr) { showMsg("Connect an external wallet first", "error"); return; }

    if (has2FA && !totpCode) { setNeeds2FA(true); showMsg("Enter your 2FA code to proceed", "info"); return; }

    setWithdrawing(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: credits, toAddress: toAddr, token: "USDT", totpCode: totpCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requires2FA) { setNeeds2FA(true); showMsg("Enter your 2FA code", "info"); }
        else showMsg(data.error || "Withdrawal failed", "error");
        setWithdrawing(false);
        return;
      }
      showMsg(`Withdrawn ${data.amountUSD} USDT → ${data.txHash.slice(0, 14)}...`, "success");
      setWithdrawAmount(""); setTotpCode(""); setNeeds2FA(false);
      // Refresh balance
      const c = await fetch("/api/credits").then(r => r.json());
      setBalance(c.balance);
    } catch { showMsg("Network error", "error"); }
    setWithdrawing(false);
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading wallet...</div>;

  const chain = process.env.NEXT_PUBLIC_CHAIN || "amoy";
  const isTestnet = chain === "amoy";
  const explorerBase = isTestnet ? "https://amoy.polygonscan.com" : "https://polygonscan.com";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Nav />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pt-20">
        <h1 className="text-2xl font-black mb-1">Wallet</h1>
        <p className="text-slate-500 text-sm mb-6">
          {isTestnet ? "Polygon Amoy Testnet" : "Polygon Mainnet"} &middot; USDT / USDC
        </p>

        {isTestnet && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 text-xs text-amber-400">
            You&apos;re on the <strong>Amoy Testnet</strong>. Tokens here have no real value.
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-violet-900/30 to-slate-900 rounded-2xl p-6 border border-violet-500/15 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs">Available Credits</p>
              <p className="text-3xl font-black text-white">{balance?.available?.toLocaleString() || 0}</p>
              <p className="text-slate-600 text-xs mt-1">{((balance?.available || 0) / 100).toFixed(2)} USDT equivalent</p>
            </div>
            <a href="/credits" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">View History</a>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-black/30 p-1 mb-5">
          <button onClick={() => setTab("deposit")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${tab === "deposit" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-white"}`}>
            Deposit
          </button>
          <button onClick={() => setTab("withdraw")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${tab === "withdraw" ? "bg-amber-600 text-white" : "text-slate-500 hover:text-white"}`}>
            Withdraw
          </button>
        </div>

        {/* Status message */}
        {msg && (
          <div className={`rounded-xl px-4 py-2.5 mb-4 text-xs ${
            msgType === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
            msgType === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
            "bg-slate-800 text-slate-400"
          }`}>{msg}</div>
        )}

        {/* ── Deposit Tab ──────────────────────────────────────────── */}
        {tab === "deposit" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-bold mb-3">Send USDT/USDC to your deposit address</h2>
              <p className="text-slate-500 text-xs mb-3">
                1 USDT = 100 credits. Only send on <strong>Polygon</strong> network.
              </p>

              {wallet?.custodial ? (
                <>
                  {/* QR Code */}
                  {qrDataUrl && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white rounded-2xl p-3 shadow-lg">
                        <img src={qrDataUrl} alt="Deposit QR Code" className="w-44 h-44" />
                      </div>
                    </div>
                  )}
                  <p className="text-center text-slate-500 text-[10px] mb-3">Scan with any Polygon-compatible wallet</p>

                  <div className="bg-black/30 rounded-lg p-4 border border-white/5 mb-3">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Deposit Address (Polygon)</p>
                    <p className="font-mono text-sm text-violet-300 break-all select-all">{wallet.custodial.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(wallet.custodial.address); showMsg("Copied!", "success"); }}
                      className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 text-xs font-bold hover:bg-violet-600/30 transition">
                      Copy Address
                    </button>
                    <button onClick={checkDeposit} disabled={depositChecking}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition">
                      {depositChecking ? "Checking..." : "Check for Deposit"}
                    </button>
                    <button onClick={toggleDepositPolling}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                        depositPolling
                          ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}>
                      {depositPolling ? "Stop Auto-Check" : "Auto-Check (15s)"}
                    </button>
                  </div>
                  {depositPolling && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Monitoring for incoming deposits...
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-600 text-sm">Wallet not created yet. Sign in first.</p>
              )}

              {/* Network Disclaimers */}
              <div className="mt-4 bg-red-950/30 border border-red-500/20 rounded-xl p-3.5 space-y-1.5">
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span>⚠️</span> Important — Read Before Sending
                </p>
                <ul className="text-red-400/80 text-[10px] leading-relaxed space-y-1 list-disc list-inside">
                  <li>Only send <strong>USDT</strong> or <strong>USDC</strong> tokens</li>
                  <li>Only on the <strong>{isTestnet ? "Polygon Amoy Testnet" : "Polygon PoS (Mainnet)"}</strong> network</li>
                  <li>Do NOT send ETH, MATIC, BTC, or any other token — they will be <strong>permanently lost</strong></li>
                  <li>Do NOT send from Ethereum, BSC, Arbitrum, or any other chain — funds will be <strong>unrecoverable</strong></li>
                  <li>Minimum deposit: 1 USDT (100 credits). Smaller amounts may not be detected</li>
                  {isTestnet && <li className="text-amber-400">This is <strong>testnet</strong> — tokens have no real value</li>}
                </ul>
              </div>
            </div>

            {/* External Wallet Connection */}
            <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-bold mb-3">External Wallet</h2>
              {wallet?.external ? (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Connected:</p>
                  <p className="font-mono text-sm text-emerald-300 break-all">{wallet.external.address}</p>
                  <a href={`${explorerBase}/address/${wallet.external.address}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-violet-400 hover:underline mt-1 inline-block">View on Explorer &rarr;</a>
                </div>
              ) : (
                <div>
                  <p className="text-slate-500 text-xs mb-3">Connect a wallet for withdrawals.</p>
                  <div className="flex gap-2">
                    <input value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)}
                      placeholder="0x..." className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none" />
                    <button onClick={async () => {
                      if (!withdrawAddress) return;
                      const res = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect_external", address: withdrawAddress }) });
                      if (res.ok) { showMsg("Wallet connected!", "success"); const w = await fetch("/api/wallet").then(r => r.json()); setWallet(w); }
                      else { const d = await res.json(); showMsg(d.error, "error"); }
                    }} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">Connect</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Withdraw Tab ─────────────────────────────────────────── */}
        {tab === "withdraw" && (
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">Withdraw Credits</h2>
            <p className="text-slate-500 text-xs mb-4">
              Min: 500 credits (5 USDT). Sent as USDT on Polygon to your external wallet.
              {has2FA && <span className="text-violet-400 ml-1">2FA verification required.</span>}
            </p>

            {!wallet?.external ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-xs text-amber-400">
                Connect an external wallet first (Deposit tab → External Wallet section).
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Withdraw To</label>
                  <p className="font-mono text-xs text-emerald-300 bg-black/20 rounded-lg px-3 py-2 break-all">{wallet.external.address}</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Amount (Credits)</label>
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder="500" min="500"
                    className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm focus:border-violet-500 focus:outline-none" />
                  {withdrawAmount && parseInt(withdrawAmount) >= 500 && (
                    <p className="text-slate-500 text-[10px] mt-1">= {(parseInt(withdrawAmount) / 100).toFixed(2)} USDT</p>
                  )}
                </div>

                {/* 2FA Code (if needed) */}
                {(has2FA || needs2FA) && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">2FA Code</label>
                    <input type="text" inputMode="numeric" value={totpCode} onChange={e => setTotpCode(e.target.value)}
                      placeholder="6-digit code" maxLength={9}
                      className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm font-mono tracking-widest text-center focus:border-violet-500 focus:outline-none" />
                  </div>
                )}

                <button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount}
                  className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm transition">
                  {withdrawing ? "Processing..." : "Withdraw USDT"}
                </button>

                <p className="text-slate-700 text-[10px]">
                  New accounts must wait 24 hours before first withdrawal. All withdrawals are final.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Security Info */}
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 mt-4">
          <h3 className="text-xs font-bold text-slate-500 mb-2">Security</h3>
          <div className="space-y-1 text-[10px] text-slate-600">
            <p>Custodial wallet keys encrypted with AES-256-GCM.</p>
            <p>Withdrawals require 2FA if enabled on your account.</p>
            <p>All transactions recorded on the Polygon blockchain.</p>
            <p>24-hour cooldown for new account withdrawals.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
