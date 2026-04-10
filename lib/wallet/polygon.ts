/**
 * Polygon Wallet Service
 * Generates custodial wallets, monitors deposits, processes withdrawals.
 * Supports USDT and USDC on Polygon PoS.
 *
 * Security: AES-256-GCM encryption for custodial private keys.
 * Mock mode: Set MOCK_WALLET=true for testnet without real contracts.
 */

import { ethers } from "ethers";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
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
    explorer: "https://polygonscan.com",
  },
  amoy: {
    rpc: "https://rpc-amoy.polygon.technology",
    chainId: 80002,
    usdt: "", // deploy mock ERC-20 for testing, or use MOCK_WALLET=true
    usdc: "",
    explorer: "https://amoy.polygonscan.com",
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

export function getExplorerUrl() {
  return getChainConfig().explorer;
}

// Mock mode: ONLY allowed when both MOCK_WALLET=true AND NEXT_PUBLIC_CHAIN=amoy (testnet)
// This prevents accidentally enabling mock mode on mainnet
const IS_MOCK = process.env.MOCK_WALLET === "true" && (process.env.NEXT_PUBLIC_CHAIN || "amoy") === "amoy";

// ── ERC-20 ABI (minimal) ───────────────────────────────────────────────────

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ── AES-256-GCM Wallet Encryption ──────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const hex = process.env.WALLET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate: openssl rand -hex 32");
  }
  return Buffer.from(hex, "hex");
}

function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  // Format: aes:iv:ciphertext:authTag (distinguishable from old base64 format)
  return `aes:${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`;
}

function decryptPrivateKey(encrypted: string): string {
  // Handle new AES-256-GCM format
  if (encrypted.startsWith("aes:")) {
    const key = getEncryptionKey();
    const [, ivB64, ciphertextB64, tagB64] = encrypted.split(":");

    if (!ivB64 || !ciphertextB64 || !tagB64) {
      throw new Error("Invalid encrypted wallet key format");
    }

    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Legacy base64 format (enc:xxx) — support for migration
  if (encrypted.startsWith("enc:")) {
    return Buffer.from(encrypted.slice(4), "base64").toString();
  }

  // Plaintext fallback (shouldn't happen in production)
  return encrypted;
}

// ── Generate Custodial Wallet ──────────────────────────────────────────────

export async function createCustodialWallet(
  userId: string
): Promise<{ address: string }> {
  const existing = await db
    .select()
    .from(schema.wallets)
    .where(eq(schema.wallets.userId, userId))
    .limit(1);

  const custodial = existing.find((w) => w.type === "custodial");
  if (custodial) {
    // Migrate old base64 keys to AES-256-GCM if needed
    if (custodial.encryptedPrivateKey?.startsWith("enc:")) {
      try {
        const plainKey = decryptPrivateKey(custodial.encryptedPrivateKey);
        const reEncrypted = encryptPrivateKey(plainKey);
        await db.update(schema.wallets)
          .set({ encryptedPrivateKey: reEncrypted })
          .where(eq(schema.wallets.id, custodial.id));
        console.log(`[Wallet] Migrated key for user ${userId} to AES-256-GCM`);
      } catch {
        console.error(`[Wallet] Failed to migrate key for user ${userId}`);
      }
    }
    return { address: custodial.address };
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

// ── Connect External Wallet ────────────────────────────────────────────────

export async function connectExternalWallet(
  userId: string,
  address: string
): Promise<void> {
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid wallet address");
  }

  const existing = await db
    .select()
    .from(schema.wallets)
    .where(eq(schema.wallets.userId, userId));

  const hasExternal = existing.some((w) => w.type === "external");
  if (hasExternal) {
    await db.update(schema.wallets)
      .set({ address })
      .where(eq(schema.wallets.userId, userId));
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

// ── Get User Wallet ────────────────────────────────────────────────────────

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

// ── Check Deposit ──────────────────────────────────────────────────────────

export async function checkDeposits(
  userId: string,
  walletAddress: string
): Promise<{ found: boolean; amount: number; token: string } | null> {
  // Mock mode: return fake deposit for testing
  if (IS_MOCK) {
    console.log(`[Wallet Mock] Fake deposit check for ${walletAddress}`);
    return { found: true, amount: 10, token: "USDT" };
  }

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

// ── Process Deposit ────────────────────────────────────────────────────────

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

// ── Process Withdrawal ─────────────────────────────────────────────────────

export const MIN_WITHDRAWAL = 500; // 500 credits = 5 USDT
const WITHDRAWAL_COOLDOWN_HOURS = 24;

export async function requestWithdrawal(
  userId: string,
  creditsAmount: number,
  toAddress: string,
  token: "USDT" | "USDC" = "USDT"
): Promise<{ txHash: string; amountUSD: number }> {
  if (!ethers.isAddress(toAddress)) throw new Error("Invalid address");
  if (creditsAmount < MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal is ${MIN_WITHDRAWAL} credits (${MIN_WITHDRAWAL / 100} ${token})`);
  }

  const amountUSD = creditsAmount / 100;

  // Check account age for cooldown
  const [user] = await db.select({ createdAt: schema.users.createdAt })
    .from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (user) {
    const hoursOld = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursOld < WITHDRAWAL_COOLDOWN_HOURS) {
      const remaining = Math.ceil(WITHDRAWAL_COOLDOWN_HOURS - hoursOld);
      throw new Error(`New accounts must wait ${remaining} more hours before withdrawing`);
    }
  }

  // Debit credits first (atomic — prevents double-spend)
  const { debitUser } = await import("./credits");
  await debitUser(userId, creditsAmount, "withdrawal");

  // Mock mode: skip on-chain transfer
  if (IS_MOCK) {
    const mockHash = `0xmock_${randomBytes(16).toString("hex")}`;
    console.log(`[Wallet Mock] Withdrawal: ${amountUSD} ${token} to ${toAddress} → ${mockHash}`);

    await logAudit({
      userId,
      action: "wallet:withdrawal",
      resource: "credit",
      details: { creditsAmount, amountUSD, token, toAddress, txHash: mockHash, mock: true },
      success: true,
    });

    return { txHash: mockHash, amountUSD };
  }

  // Real on-chain transfer from hot wallet
  const hotWalletKey = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!hotWalletKey) {
    throw new Error("Withdrawal system not configured — contact support");
  }

  const config = getChainConfig();
  const provider = getProvider();
  const hotWallet = new ethers.Wallet(hotWalletKey, provider);
  const contractAddr = token === "USDT" ? config.usdt : config.usdc;

  if (!contractAddr) throw new Error("Token not supported on this chain");

  const contract = new ethers.Contract(contractAddr, ERC20_ABI, hotWallet);
  const decimals = await contract.decimals();
  const tokenAmount = ethers.parseUnits(amountUSD.toString(), decimals);

  const tx = await contract.transfer(toAddress, tokenAmount);
  await tx.wait();

  await logAudit({
    userId,
    action: "wallet:withdrawal",
    resource: "credit",
    details: { creditsAmount, amountUSD, token, toAddress, txHash: tx.hash },
    success: true,
  });

  return { txHash: tx.hash, amountUSD };
}
