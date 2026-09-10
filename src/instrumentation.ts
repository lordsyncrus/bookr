export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "development") {
    const { startEditorialWorker } = await import("./lib/editorial/worker");
    startEditorialWorker();
  }
}
