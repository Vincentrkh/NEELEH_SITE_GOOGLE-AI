import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  validateExternalHttpsUrl,
  validateGitRepoUrl,
  validateGitBranchName,
  verifyGithubHmacSignature,
} from "./crypto-vault";

test("encryptSecret and decryptSecret roundtrip with AES-256-GCM", () => {
  const key = "unit-test-vault-secret-32-chars-minimum";
  const token = "sk-live-test-token-987654";
  const enc = encryptSecret(token, key);
  assert.ok(enc.startsWith("enc:v1:"));
  assert.notEqual(enc, token);
  assert.equal(decryptSecret(enc, key), token);
  assert.equal(decryptSecret(enc, "wrong-secret"), "");
});

test("maskSecret hides middle characters safely", () => {
  assert.equal(maskSecret("sk-proj-1234567890abcd"), "sk-••••abcd");
  assert.equal(maskSecret("short"), "••••");
  assert.equal(maskSecret(""), "");
});

test("validateExternalHttpsUrl blocks SSRF private/loopback and http", () => {
  assert.equal(validateExternalHttpsUrl("https://api.openai.com/v1").ok, true);
  assert.equal(validateExternalHttpsUrl("http://api.openai.com/v1").ok, false);
  assert.equal(validateExternalHttpsUrl("https://127.0.0.1/v1").ok, false);
  assert.equal(validateExternalHttpsUrl("https://169.254.169.254/latest").ok, false);
  assert.equal(validateExternalHttpsUrl("https://192.168.1.10/v1").ok, false);
  assert.equal(validateExternalHttpsUrl("https://user:pass@api.openai.com/v1").ok, false);
  assert.equal(
    validateExternalHttpsUrl("http://127.0.0.1:11434/v1", { allowOllamaLoopback: true }).ok,
    true,
  );
});

test("validateGitRepoUrl & validateGitBranchName enforce safe Git targets", () => {
  const gh = validateGitRepoUrl("https://github.com/neeleh-academy/cms.git");
  assert.equal(gh.ok, true);
  if (gh.ok) {
    assert.equal(gh.githubOwnerRepo, "neeleh-academy/cms");
  }
  assert.equal(validateGitRepoUrl("ssh://git@github.com/a/b.git").ok, false);
  assert.equal(validateGitBranchName("main"), true);
  assert.equal(validateGitBranchName("release/v2.1"), true);
  assert.equal(validateGitBranchName("--upload-pack=evil"), false);
  assert.equal(validateGitBranchName("main;rm -rf"), false);
});

test("verifyGithubHmacSignature validates HMAC-SHA256 webhooks", () => {
  const secret = "webhook-secret-xyz";
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyGithubHmacSignature(body, sig, secret), true);
  assert.equal(verifyGithubHmacSignature(body, sig, "wrong"), false);
  assert.equal(verifyGithubHmacSignature(body + "x", sig, secret), false);
});
