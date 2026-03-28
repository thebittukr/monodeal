"use client";

import { useState, useEffect } from "react";

interface Balance {
  available: number;
  locked: number;
  total: number;
  lifetimeDeposited: number;
  lifetimeWithdrawn: number;
  lifetimeWon: number;
  lifetimeLost: number;
  lifetimeRake: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  txHash: string | null;
  status: string;
  createdAt: string;
}

interface Wallet {
  custodial: { address: string } | null;
  external: { address: string } | null;
}

export default function CreditsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "deposit" | "withdraw" | "history">("overview");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [creditsRes, walletRes] = await Promise.all([
        fetch("/api/credits").then((r) => r.json()),
        fetch("/api/wallet").then((r) => r.json()),
      ]);
      setBalance(creditsRes.balance);
      setTransactions(creditsRes.transactions || []);
      setWallet(walletRes);
    } catch (err) {
      console.error("Failed to load credits:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading credits...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-purple-400 hover:underline text-sm mb-4 block">
          &larr; Back to game
        </a>

        <h1 className="text-3xl font-bold mb-6">Credits</h1>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-purple-900/50 to-slate-900 rounded-2xl p-6 border border-purple-500/20 mb-6">
          <p className="text-slate-400 text-sm">Available Balance</p>
          <p className="text-4xl font-bold text-white mt-1">
            {balance?.available?.toLocaleString() || 0}
            <span className="text-lg text-slate-400 ml-2">credits</span>
          </p>
          {(balance?.locked || 0) > 0 && (
            <p className="text-yellow-400 text-sm mt-1">
              {balance?.locked?.toLocaleString()} locked in games
            </p>
          )}
          <p className="text-slate-500 text-xs mt-2">
            ≈ ${((balance?.available || 0) / 100).toFixed(2)} USDT
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1 mb-6">
          {(["overview", "deposit", "withdraw", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                tab === t
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Deposited", value: balance?.lifetimeDeposited || 0, color: "text-green-400" },
              { label: "Withdrawn", value: balance?.lifetimeWithdrawn || 0, color: "text-blue-400" },
              { label: "Won", value: balance?.lifetimeWon || 0, color: "text-yellow-400" },
              { label: "Lost", value: balance?.lifetimeLost || 0, color: "text-red-400" },
              { label: "Rake Paid", value: balance?.lifetimeRake || 0, color: "text-slate-400" },
              { label: "Net P&L", value: (balance?.lifetimeWon || 0) - (balance?.lifetimeLost || 0), color: ((balance?.lifetimeWon || 0) - (balance?.lifetimeLost || 0)) >= 0 ? "text-green-400" : "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <p className="text-slate-500 text-xs">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "deposit" && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="font-semibold mb-4">Deposit USDT/USDC</h3>
            <p className="text-slate-400 text-sm mb-4">
              Send USDT or USDC on Polygon to your deposit address. Credits are added automatically (1 USDT = 100 credits).
            </p>
            {wallet?.custodial ? (
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Your Polygon Deposit Address</p>
                <p className="font-mono text-sm text-purple-300 break-all">
                  {wallet.custodial.address}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(wallet.custodial!.address)}
                  className="mt-2 text-xs text-purple-400 hover:underline"
                >
                  Copy address
                </button>
              </div>
            ) : (
              <p className="text-slate-500">Wallet loading...</p>
            )}
            <p className="text-yellow-500/70 text-xs mt-4">
              Only send USDT or USDC on Polygon network. Other tokens will be lost.
            </p>
          </div>
        )}

        {tab === "withdraw" && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="font-semibold mb-4">Withdraw</h3>
            <p className="text-slate-400 text-sm mb-4">
              Minimum withdrawal: 500 credits (5 USDT). Withdrawals are processed to your connected wallet.
            </p>
            {wallet?.external ? (
              <p className="text-sm text-slate-400">
                External wallet: <span className="font-mono text-purple-300">{wallet.external.address.slice(0, 8)}...{wallet.external.address.slice(-6)}</span>
              </p>
            ) : (
              <p className="text-slate-500 text-sm">
                Connect MetaMask to enable withdrawals.
              </p>
            )}
            <p className="text-slate-600 text-xs mt-4">
              Withdrawal system is being finalized. Coming soon.
            </p>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No transactions yet</p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-900 rounded-lg p-3 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tx.type.replace("_", " ").toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p
                    className={`font-bold ${
                      tx.amount >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
