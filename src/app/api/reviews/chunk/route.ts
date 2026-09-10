import { hexclaveServerApp } from "@/hexclave/server";
import { reviewSample, ReviewError } from "@/lib/openrouter.server";
export const runtime = "nodejs";
export const maxDuration = 120;
const inFlight = new Set<string>();
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const error = (code: string, status: number) =>
  Response.json({ error: code }, { status, headers });
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return error("DISABLED", 404);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return error("UNAUTHORIZED", 403);
  let user;
  try {
    user = await hexclaveServerApp.getUser({
      tokenStore: request,
      or: "throw",
    });
  } catch {
    return error("UNAUTHORIZED", 401);
  }
  if (inFlight.has(user.id)) return error("BUSY", 429);
  inFlight.add(user.id);
  try {
    // Bound the decoded request even when Content-Length is omitted.
    const reader = request.body?.getReader();
    if (!reader) return error("EMPTY_MANUSCRIPT", 400);
    const decoder = new TextDecoder();
    let body = "";
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 80_000) {
        await reader.cancel();
        return error("FILE_TOO_LARGE", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return error("PARSE_FAILED", 400);
    }
    if (
      typeof data?.text !== "string" ||
      !data.text.trim() ||
      data.text.length > 12_000
    )
      return error("INVALID_TEXT", 400);
    return Response.json(
      await reviewSample(
        data.text,
        data.locale === "en" ? "en" : "it",
        request.signal,
      ),
      { headers },
    );
  } catch (caught) {
    return error(
      caught instanceof ReviewError ? caught.message : "PROVIDER",
      503,
    );
  } finally {
    inFlight.delete(user.id);
  }
}
