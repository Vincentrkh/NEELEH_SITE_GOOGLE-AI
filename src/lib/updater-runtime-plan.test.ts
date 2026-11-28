import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPreservableHashedAsset,
  resolveProductionBuildAndReloadPlan,
} from "./updater-runtime-plan";

describe("resolveProductionBuildAndReloadPlan", () => {
  it("prioritizes supervisor over PM2 so prod-server running under PM2 swaps slots cleanly", () => {
    const plan = resolveProductionBuildAndReloadPlan({
      supervisorActive: true,
      pm2Name: "neeleh",
      customRestartCmd: null,
      isCloudRun: false,
      hasHandoffScripts: true,
      activeDist: ".next",
    });

    assert.equal(plan.reloadStrategy, "supervisor");
    assert.equal(plan.buildDistDir, ".next-blue");
  });

  it("toggles back from .next-blue to .next when supervisor is active", () => {
    const plan = resolveProductionBuildAndReloadPlan({
      supervisorActive: true,
      pm2Name: null,
      customRestartCmd: null,
      isCloudRun: false,
      hasHandoffScripts: true,
      activeDist: ".next-blue",
    });

    assert.equal(plan.reloadStrategy, "supervisor");
    assert.equal(plan.buildDistDir, ".next");
  });

  it("uses .next and pm2 reload when PM2 runs without prod-server supervisor", () => {
    const plan = resolveProductionBuildAndReloadPlan({
      supervisorActive: false,
      pm2Name: "neeleh",
      customRestartCmd: null,
      isCloudRun: false,
      hasHandoffScripts: true,
      activeDist: ".next",
    });

    assert.equal(plan.reloadStrategy, "pm2");
    assert.equal(plan.buildDistDir, ".next");
  });

  it("uses handoff to prod-server when neither supervisor, PM2, custom cmd, nor Cloud Run is active", () => {
    const plan = resolveProductionBuildAndReloadPlan({
      supervisorActive: false,
      pm2Name: null,
      customRestartCmd: "",
      isCloudRun: false,
      hasHandoffScripts: true,
      activeDist: ".next",
    });

    assert.equal(plan.reloadStrategy, "handoff");
    assert.equal(plan.buildDistDir, ".next-blue");
  });

  it("falls back to restart-required on Cloud Run", () => {
    const plan = resolveProductionBuildAndReloadPlan({
      supervisorActive: false,
      pm2Name: null,
      customRestartCmd: null,
      isCloudRun: true,
      hasHandoffScripts: true,
      activeDist: ".next",
    });

    assert.equal(plan.reloadStrategy, "restart-required");
    assert.equal(plan.buildDistDir, ".next");
  });
});

describe("isPreservableHashedAsset", () => {
  it("preserves hashed CSS, JS chunks, and webfont files", () => {
    assert.equal(isPreservableHashedAsset("chunks/0-2c_t_d7976i.css"), true);
    assert.equal(isPreservableHashedAsset("css/app-1234abcd.css"), true);
    assert.equal(isPreservableHashedAsset("chunks/2dx5jfp9onfch.js"), true);
    assert.equal(isPreservableHashedAsset("media/edb99fec956915f8.woff2"), true);
  });

  it("ignores build-id manifest directories or non-asset files", () => {
    assert.equal(isPreservableHashedAsset("BUILD_ID/_buildManifest.js"), false);
    assert.equal(isPreservableHashedAsset("chunks/app.js.map"), false);
    assert.equal(isPreservableHashedAsset(""), false);
  });
});
