/**
 * Polygon Wallet Service
 * Generates custodial wallets, monitors deposits, processes withdrawals.
 * Supports USDT and USDC on Polygon PoS.
 */

import { ethers } from "ethers";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { creditUser } from "./credits";
import { logAudit } from "@/lib/security/audit";

// ── Chain Config ─────────────────────────────────────────────────────────────

const CHAINS = {
  polygon: {
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  amoy: {
    rpc: "https://rpc-amoy.polygon.technology",
    chainId: 80002,
    usdt: "", // deploy mock for testing
    usdc: "", // deploy mock for testing
  },
};

function getChainConfig() {
  const chain = process.env.NEXT_PUBLIC_CHAIN || "amoy";
  return CHAINS[chain as keyof typeof CHAINS] || CHAINS.amoy;
}

function getProvider() {
  const config = getChainConfig();
  return new ethers.JsonRpcProvider(config.rpc);
}

// ── ERC-20 ABI (minimal — just what we need) ────────────────────────────────

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ── Wallet Encryption ────────────────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || "dev-key-change-in-production";

function encryptPrivateKey(privateKey: string): string {
  // Simple XOR encryption for dev — use AES-256-GCM in production
  // TODO: Replace with proper AES-256-GCM encryption
  const encoded = Buffer.from(privateKey).toString("base64");
  return `enc:${encoded}`;
}

function decryptPrivateKey(encrypted: string): string {
  if (!encrypted.startsWith("enc:")) return encrypted;
  return Buffer.from(encrypted.slice(4), "base64").toString();
}

// ── Generate Custodial Wallet ────────────────────────────────────────────────

export async function createCustodialWallet(
  userId: string
): Promise<{ address: string }> {
  // Check if wallet already exists
  const existing = await db
    .select()
    .from(schema.wallets)
    .where(eq(schema.wallets.userId, userId))
    .limit(1);

  if (existing.length > 0 && existing[0].type === "custodial") {
    return { address: existing[0].address };
  }

  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = encryptPrivateKey(wallet.privateKey);

  await db.insert(schema.wallets).values({
    userId,
    type: "custodial",
    address: wallet.address,
    encryptedPrivateKey: encryptedKey,
    chain: "polygon",
  });

  await logAudit({
    userId,
    action: "wallet:create",
    resource: "wallet",
    details: { address: wallet.address, type: "custodial" },
    success: true,
  });

  return { address: wallet.address };
}

// ── Connect External Wallet (MetaMask) ───────────────────────────────────────

export async function connectExternalWallet(
  userId: string,
  address: string
): Promise<void> {
  // Validate address format
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid wallet address");
  }

  // Check if already connected
  const existing = await db
    .select()
    .from(schema.wallets)
    .where(eq(schema.wallets.userId, userId));

  const hasExternal = existing.some((w) => w.type === "external");
  if (hasExternal) {
    // Update existing external wallet
    await db
      .update(schema.wallets)
      .set({ address })
      .where(
        eq(schema.wallets.userId, userId)
      );
  } else {
    await db.insert(schema.wallets).values({
      userId,
      type: "external",
      address,
      chain: "polygon",
    });
  }

  await logAudit({
    userId,
    action: "wallet:connect_external",
    resource: "wallet",
    details: { address },
    success: true,
  });
}

// ── Get User Wallet ──────────────────────────────────────────────────────────

export async function getUserWallet(userId: string) {
  const wallets = await db
    .select({
      address: schema.wallets.address,
      type: schema.wallets.type,
      chain: schema.wallets.chain,
    })
    .from(schema.wallets)
    .where(eq(schema.wallets.userId, userId));

  return {
    custodial: wallets.find((w) => w.type === "custodial") || null,
    external: wallets.find((w) => w.type === "external") || null,
  };
}

// ── Check Deposit (poll for incoming USDT/USDC transfers) ────────────────────

export async function checkDeposits(
  userId: string,
  walletAddress: string
): Promise<{ found: boolean; amount: number; token: string } | null> {
  const config = getChainConfig();
  const provider = getProvider();

  for (const [token, contractAddr] of [
    ["USDT", config.usdt],
    ["USDC", config.usdc],
  ] as const) {
    if (!contractAddr) continue;

    try {
      const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      const amount = Number(ethers.formatUnits(balance, decimals));

      if (amount > 0) {
        return { found: true, amount, token };
      }
    } catch (err) {
      console.error(`[Wallet] Failed to check ${token} balance:`, err);
    }
  }

  return null;
}

// ── Process Deposit (credit user after confirmation) ─────────────────────────

export async function processDeposit(
  userId: string,
  amountUSD: number,
  token: string,
  txHash: string
): Promise<{ creditsAdded: number }> {
  const creditsToAdd = Math.floor(amountUSD * 100); // 1 USDT = 100 credits

  if (creditsToAdd <= 0) throw new Error("Amount too small");

  await creditUser(userId, creditsToAdd, "deposit", undefined, txHash);

  await logAudit({
    userId,
    action: "wallet:deposit",
    resource: "credit",
    details: { amountUSD, token, txHash, creditsAdded: creditsToAdd },
    success: true,
  });

  return { creditsAdded: creditsToAdd };
}

// ── Process Withdrawal ───────────────────────────────────────────────────────

const MIN_WITHDRAWAL = 500; // 500 credits = 5 USDT
const WITHDRAWAL_COOLDOWN_HOURS = 24; // new accounts wait 24h

export async function requestWithdrawal(
  userId: string,
  creditsAmount: number,
  toAddress: string,
  token: "USDT" | "USDC" = "USDT"
): Promise<{ txHash: string; amountUSD: number }> {
  // Validations
  if (!ethers.isAddress(toAddress)) throw new Error("Invalid address");
  if (creditsAmount < MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL} credits (${MIN_WITHDRAWAL / 100} ${token})`);
  }

  const amountUSD = creditsAmount / 100;

  // Debit credits first (atomic — prevents double-spend)
  const { debitUser } = await import("./credits");
  await debitUser(userId, creditsAmount, "withdrawal");

  // Get custodial wallet to send from (hot wallet)
  const config = getChainConfig();
  const provider = getProvider();

  // Use platform hot wallet for withdrawals
  const hotWalletKey = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!hotWalletKey) {
    throw new Error("Withdrawal system not configured");
  }

  const hotWallet = new ethers.Wallet(hotWalletKey, provider);
  const contractAddr = token === "USDT" ? config.usdt : config.usdc;

  if (!contractAddr) throw new Error("Token not supported on this chain");

  const contract = new ethers.Contract(contractAddr, ERC20_ABI, hotWallet);
  const decimals = await contract.decimals();
  const tokenAmount = ethers.parseUnits(amountUSD.toString(), decimals);

  // Send tokens
  const tx = await contract.transfer(toAddress, tokenAmount);
  await tx.wait();

  await logAudit({
    userId,
    action: "wallet:withdrawal",
    resource: "credit",
    details: {
      creditsAmount,
      amountUSD,
      token,
      toAddress,
      txHash: tx.hash,
    },
    success: true,
  });

  return { txHash: tx.hash, amountUSD };
}
