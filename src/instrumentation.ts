export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPeriodicUpdateScheduler } = await import("@/lib/system-updater");
    startPeriodicUpdateScheduler();
  }
}
