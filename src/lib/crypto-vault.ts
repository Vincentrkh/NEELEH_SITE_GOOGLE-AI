import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { getRuntimeSecret } from "./auth";

const VAULT_PREFIX = "enc:v1:";

function deriveKey(secretInput?: string): Buffer {
  const base =
    secretInput?.trim() ||
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    getRuntimeSecret();
  return createHash("sha256")
    .update(`neeleh-vault:v1:${base}`)
    .digest();
}

export function encryptSecret(plaintext: string, secretInput?: string): string {
  const clean = String(plaintext ?? "").trim();
  if (!clean) return "";
  const key = deriveKey(secretInput);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VAULT_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(stored: string | null | undefined, secretInput?: string): string {
  const raw = String(stored ?? "").trim();
  if (!raw) return "";
  if (!raw.startsWith(VAULT_PREFIX)) {
    return raw;
  }
  const rest = raw.slice(VAULT_PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 3) return "";
  try {
    const [ivStr, tagStr, dataStr] = parts;
    const key = deriveKey(secretInput);
    const iv = Buffer.from(ivStr, "base64url");
    const tag = Buffer.from(tagStr, "base64url");
    const ciphertext = Buffer.from(dataStr, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return "";
  }
}

export function maskSecret(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.length <= 6) return "••••";
  return `${s.slice(0, 3)}••••${s.slice(-4)}`;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
  /^metadata\.google\.internal$/i,
];

export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!clean) return true;
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(clean));
}

export function validateExternalHttpsUrl(
  raw: string,
  options?: { allowOllamaLoopback?: boolean },
): { ok: true; normalized: string } | { ok: false; error: string } {
  const input = String(raw ?? "").trim();
  if (!input || /[\u0000-\u001f\u007f\s]/.test(input)) {
    return { ok: false, error: "URL contains invalid characters" };
  }
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Embedded credentials in URL are not allowed" };
  }

  if (options?.allowOllamaLoopback) {
    const isPinnedOllama =
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
      (parsed.port === "11434" || parsed.port === "");
    if (isPinnedOllama) {
      return { ok: true, normalized: parsed.toString().replace(/\/+$/, "") };
    }
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only HTTPS endpoints are allowed" };
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return { ok: false, error: "Private or loopback network hosts are blocked" };
  }
  return { ok: true, normalized: parsed.toString().replace(/\/+$/, "") };
}

export function validateGitRepoUrl(
  raw: string,
): { ok: true; normalized: string; githubOwnerRepo?: string } | { ok: false; error: string } {
  const res = validateExternalHttpsUrl(raw);
  if (!res.ok) return res;
  const parsed = new URL(res.normalized);
  if (!/^\/[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)+(\.git)?$/.test(parsed.pathname)) {
    return { ok: false, error: "Invalid Git repository path" };
  }
  let githubOwnerRepo: string | undefined;
  if (parsed.hostname.toLowerCase() === "github.com") {
    const segs = parsed.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
    if (segs.length === 2) {
      githubOwnerRepo = `${segs[0]}/${segs[1]}`;
    }
  }
  return { ok: true, normalized: res.normalized, githubOwnerRepo };
}

export function validateGitBranchName(branch: string): boolean {
  const b = String(branch ?? "").trim();
  if (!b || b.length > 80) return false;
  if (b.startsWith("-") || b.includes("..") || b.includes("//") || b.endsWith("/")) {
    return false;
  }
  return /^[a-zA-Z0-9._/-]+$/.test(b);
}

export function verifyGithubHmacSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  const sig = String(signatureHeader ?? "").trim();
  if (!sig.startsWith("sha256=") || !secret) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
