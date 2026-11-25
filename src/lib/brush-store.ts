/**
 * Shared runtime store for the fluid-reveal brush (mouse-trail) size.
 *
 * The WebGL simulation reads `brushStore.radius` on EVERY frame, so the
 * settings slider can change the trail diameter live — without re-mounting
 * the canvas or restarting the simulation loop.
 *
 * `radius` is the gaussian splat radius in field-UV space — the same
 * constant (`E=0.004`) used by bleibtgleich.dev's `initFluidReveal()`.
 *
 * Note on perceived size: the revealed trail diameter grows roughly with
 * √radius (the mask shader cuts off where 3.5·exp(−r²/R) < ~0.395), so the
 * UI slider maps logarithmically for equal visual steps.
 */

export const BRUSH_DEFAULT_RADIUS = 0.004;
export const BRUSH_MIN_RADIUS = 0.0002;
export const BRUSH_MAX_RADIUS = 0.02;

export const brushStore = {
  radius: BRUSH_DEFAULT_RADIUS,

  /** Set the current radius (clamped to [MIN, MAX]). */
  set(radius: number) {
    this.radius = Math.min(BRUSH_MAX_RADIUS, Math.max(BRUSH_MIN_RADIUS, radius));
  },

  reset() {
    this.radius = BRUSH_DEFAULT_RADIUS;
  },
};

// Handy for live tweaking from the devtools console (and for e2e tests).
if (typeof window !== "undefined") {
  (window as unknown as { __brushStore: typeof brushStore }).__brushStore =
    brushStore;
}
