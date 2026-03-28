"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/wallet").then(r => r.json()),
      fetch("/api/credits").then(r => r.json()),
    ]).then(([w, c]) => {
      setWallet(w);
      setBalance(c.balance);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading wallet...</div>;

  const chain = process.env.NEXT_PUBLIC_CHAIN || "amoy";
  const isTestnet = chain === "amoy";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Nav />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-black mb-1">Wallet</h1>
        <p className="text-slate-500 text-sm mb-6">
          {isTestnet ? "Polygon Amoy Testnet" : "Polygon Mainnet"} &middot; USDT / USDC
        </p>

        {isTestnet && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 text-xs text-amber-400">
            You're on the <strong>Amoy Testnet</strong>. Tokens here have no real value. Get test MATIC from{" "}
            <a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Faucet</a>.
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

        {/* Deposit */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-bold mb-3">Deposit</h2>
          <p className="text-slate-500 text-xs mb-3">
            Send USDT or USDC on Polygon to this address. 1 USDT = 100 credits. Credits are added automatically after confirmation.
          </p>

          {wallet?.custodial ? (
            <div className="bg-black/30 rounded-lg p-4 border border-white/5">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Your Deposit Address (Polygon)</p>
              <p className="font-mono text-sm text-violet-300 break-all select-all">{wallet.custodial.address}</p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(wallet.custodial.address); setMsg("Address copied!"); setTimeout(() => setMsg(""), 2000); }}
                  className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 text-xs font-bold hover:bg-violet-600/30 transition">
                  Copy Address
                </button>
                {msg && <span className="text-emerald-400 text-xs">{msg}</span>}
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">Wallet not created yet. Sign in first.</p>
          )}

          <p className="text-red-400/60 text-[10px] mt-3">
            Only send USDT or USDC on Polygon network. Other tokens or chains will result in permanent loss.
          </p>
        </div>

        {/* External Wallet (MetaMask) */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-bold mb-3">External Wallet</h2>
          {wallet?.external ? (
            <div>
              <p className="text-slate-500 text-xs mb-2">Connected wallet:</p>
              <p className="font-mono text-sm text-emerald-300 break-all">{wallet.external.address}</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-500 text-xs mb-3">
                Connect MetaMask or paste a wallet address for withdrawals.
              </p>
              <div className="flex gap-2">
                <input
                  value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)}
                  placeholder="0x..." className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none"
                />
                <button
                  onClick={async () => {
                    if (!withdrawAddress) return;
                    const res = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect_external", address: withdrawAddress }) });
                    if (res.ok) { setMsg("Wallet connected!"); const w = await fetch("/api/wallet").then(r => r.json()); setWallet(w); }
                    else { const d = await res.json(); setMsg(d.error); }
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >Connect</button>
              </div>
            </div>
          )}
        </div>

        {/* Withdraw */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-bold mb-3">Withdraw</h2>
          <p className="text-slate-500 text-xs mb-3">
            Minimum: 500 credits (5 USDT). Sent to your connected external wallet.
          </p>
          {wallet?.external ? (
            <div className="flex gap-2">
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Credits amount" min="500"
                className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              <button
                onClick={async () => {
                  setMsg("");
                  if (parseInt(withdrawAmount) < 500) { setMsg("Minimum 500 credits"); return; }
                  setMsg("Processing...");
                  // TODO: Call withdrawal API when ready
                  setMsg("Withdrawal system coming soon. Funds are safe.");
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
              >Withdraw</button>
            </div>
          ) : (
            <p className="text-slate-600 text-xs">Connect an external wallet first to enable withdrawals.</p>
          )}
          {msg && <p className="text-xs mt-2 text-slate-400">{msg}</p>}
        </div>

        {/* Security Info */}
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-500 mb-2">Security</h3>
          <div className="space-y-1 text-[10px] text-slate-600">
            <p>Your custodial wallet private key is encrypted with AES-256 and stored securely.</p>
            <p>Large withdrawals require additional verification (2FA).</p>
            <p>All transactions are recorded on the Polygon blockchain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
