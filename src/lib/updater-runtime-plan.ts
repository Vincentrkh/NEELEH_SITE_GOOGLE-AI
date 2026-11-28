export type DistSlot = ".next" | ".next-blue";

export type ReloadStrategy =
  | "supervisor"
  | "pm2"
  | "custom"
  | "handoff"
  | "restart-required";

export type ProductionPlanInput = {
  supervisorActive: boolean;
  pm2Name: string | null;
  customRestartCmd?: string | null;
  isCloudRun: boolean;
  hasHandoffScripts: boolean;
  activeDist: DistSlot;
};

export type ProductionPlan = {
  buildDistDir: DistSlot;
  reloadStrategy: ReloadStrategy;
};

/**
 * Computes the safe build slot and zero-downtime reload mechanism.
 *
 * Critical invariant:
 * When `scripts/prod-server.mjs` (`supervisorActive`) is managing traffic, it MUST
 * take precedence over PM2 detection (even if PM2 launched `prod-server.mjs`),
 * otherwise `buildDistDir` builds into the inactive `.next-blue` slot while PM2
 * restarts `prod-server.mjs` still pointing at `.next` (or vice-versa).
 */
export function resolveProductionBuildAndReloadPlan(
  input: ProductionPlanInput,
): ProductionPlan {
  const customCmd = input.customRestartCmd?.trim() || "";
  const hasPm2 = Boolean(input.pm2Name && input.pm2Name.trim().length > 0);
  const canHandoff =
    !input.supervisorActive &&
    !hasPm2 &&
    !customCmd &&
    !input.isCloudRun &&
    input.hasHandoffScripts;

  const altDist: DistSlot = input.activeDist === ".next" ? ".next-blue" : ".next";

  if (input.supervisorActive) {
    return {
      buildDistDir: altDist,
      reloadStrategy: "supervisor",
    };
  }

  if (hasPm2) {
    return {
      buildDistDir: ".next",
      reloadStrategy: "pm2",
    };
  }

  if (customCmd) {
    return {
      buildDistDir: ".next",
      reloadStrategy: "custom",
    };
  }

  if (canHandoff) {
    return {
      buildDistDir: altDist,
      reloadStrategy: "handoff",
    };
  }

  return {
    buildDistDir: ".next",
    reloadStrategy: "restart-required",
  };
}

/**
 * Identifies content-hashed Next.js static assets (CSS, JS chunks, fonts)
 * safe to preserve additively across build rollovers so stale HTML / reverse-proxy
 * caches / Nginx static aliases never hit HTTP 404 on stylesheets.
 */
export function isPreservableHashedAsset(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!norm) return false;
  if (norm.startsWith("chunks/") || norm.startsWith("css/") || norm.startsWith("media/")) {
    return /\.(css|js|mjs|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|avif)$/i.test(norm);
  }
  return false;
}
