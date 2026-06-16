/**
 * Encrypted file-based credential store.
 * @see .omo/plans/zcode-proxy.md Task 14
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Credential } from "./types.js";
import type { ProviderId } from "../provider/types.js";

const STORE_DIR = join(homedir(), ".zcode-proxy");
const STORE_FILE = join(STORE_DIR, "credentials.json");
const ENV_SECRET = "ZCODE_PROXY_CREDENTIAL_SECRET";

function getEncryptionKey(): Uint8Array {
  const envKey = process.env[ENV_SECRET];
  if (envKey) {
    const encoder = new TextEncoder();
    const hash = new Uint8Array(32);
    const keyBytes = encoder.encode(envKey);
    for (let i = 0; i < keyBytes.length; i++) {
      hash[i % 32] ^= keyBytes[i];
    }
    return hash;
  }

  const machineId = `${homedir()}-${process.platform}-${process.arch}`;
  const encoder = new TextEncoder();
  const hash = new Uint8Array(32);
  const idBytes = encoder.encode(machineId);
  for (let i = 0; i < idBytes.length; i++) {
    hash[i % 32] ^= idBytes[i];
  }
  return hash;
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getEncryptionKey(),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString("base64");
}

async function decrypt(ciphertext: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getEncryptionKey(),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return new TextDecoder().decode(decrypted);
}

export async function saveCredential(cred: Credential): Promise<void> {
  mkdirSync(dirname(STORE_FILE), { recursive: true });
  const json = JSON.stringify(cred);
  const encrypted = await encrypt(json);
  writeFileSync(STORE_FILE, JSON.stringify({ encrypted }), { mode: 0o600 });
}

export async function loadCredential(): Promise<Credential | null> {
  if (!existsSync(STORE_FILE)) return null;
  const raw = readFileSync(STORE_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed.encrypted) return null;
  const json = await decrypt(parsed.encrypted);
  return JSON.parse(json) as Credential;
}

export function clearCredential(): void {
  if (existsSync(STORE_FILE)) {
    unlinkSync(STORE_FILE);
  }
}

export function getStorePath(): string {
  return STORE_FILE;
}
