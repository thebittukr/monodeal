/**
 * TOTP 2FA Utility Module
 * Handles secret generation, encryption, QR codes, verification, and recovery codes.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";

// ── Encryption (AES-256-GCM) ───────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a TOTP secret for storage.
 * Returns base64 string: iv:ciphertext:authTag
 */
export function encryptTotpSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`;
}

/**
 * Decrypt a stored TOTP secret.
 */
export function decryptTotpSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivB64, ciphertextB64, tagB64] = encrypted.split(":");

  if (!ivB64 || !ciphertextB64 || !tagB64) {
    throw new Error("Invalid encrypted TOTP format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ── TOTP Generation & Verification ──────────────────────────────────────────

/**
 * Generate a new TOTP secret with QR code data URL.
 */
export async function generateTotpSecret(
  userEmail: string
): Promise<{ secret: string; uri: string; qrDataUrl: string }> {
  const totp = new OTPAuth.TOTP({
    issuer: "PropertyRush",
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;
  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return { secret, uri, qrDataUrl };
}

/**
 * Verify a 6-digit TOTP code against an encrypted secret.
 * Allows ±1 time window (30 seconds leeway).
 */
export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const secret = decryptTotpSecret(encryptedSecret);

  const totp = new OTPAuth.TOTP({
    issuer: "PropertyRush",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // delta returns null if invalid, number if valid (0 = exact, ±1 = adjacent window)
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Verify a plain (unencrypted) TOTP secret against a code.
 * Used during setup before the secret is stored.
 */
export function verifyTotpCodePlain(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "PropertyRush",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

// ── Recovery Codes ──────────────────────────────────────────────────────────

/**
 * Generate 10 recovery codes.
 * Returns both plain (show to user once) and bcrypt-hashed (store in DB).
 */
export async function generateRecoveryCodes(): Promise<{
  plain: string[];
  hashed: string[];
}> {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // 8-char alphanumeric code split with dash: XXXX-XXXX
    const raw = randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }

  const hashed = await Promise.all(
    codes.map((code) => bcrypt.hash(code, 10))
  );

  return { plain: codes, hashed };
}

/**
 * Verify a recovery code against the stored hashed codes.
 * Returns whether valid and the updated list with the used code removed.
 */
export async function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; remainingCodes: string[] }> {
  const normalized = code.toUpperCase().replace(/\s/g, "");

  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(normalized, hashedCodes[i]);
    if (match) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return { valid: true, remainingCodes: remaining };
    }
  }

  return { valid: false, remainingCodes: hashedCodes };
}
