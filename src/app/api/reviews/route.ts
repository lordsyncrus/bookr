import { hexclaveServerApp } from "@/hexclave/server";
import { extractManuscript, ManuscriptPreflightError } from "@/lib/manuscript-preflight.server";
import { MAX_MANUSCRIPT_BYTES } from "@/lib/manuscript-types";
import { reviewSample, ReviewError } from "@/lib/openrouter.server";
export const runtime = "nodejs";
export const maxDuration = 120;
const active = new Set<string>();
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const error = (code: string, status: number) => Response.json({ error: code }, { status, headers });
export async function POST(request: Request) {
  // Full books require durable jobs and quotas; this tool is only for local development.
  if (process.env.NODE_ENV !== "development") return error("DISABLED", 404);
  if (request.headers.get("origin") !== new URL(request.url).origin) return error("UNAUTHORIZED", 403);
  let user;
  try { user = await hexclaveServerApp.getUser({ tokenStore: request, or: "throw" }); }
  catch { return error("UNAUTHORIZED", 401); }
  if (active.has(user.id)) return error("BUSY", 429);
  active.add(user.id);
  try {
    if (Number(request.headers.get("content-length")) > MAX_MANUSCRIPT_BYTES + 1024 * 1024) return error("FILE_TOO_LARGE", 413);
    const data = await request.formData();
    const file = data.get("manuscript");
    if (!(file instanceof File)) return error("MISSING_FILE", 400);
    if (file.size > MAX_MANUSCRIPT_BYTES) return error("FILE_TOO_LARGE", 413);
    const text = await extractManuscript(file);
    return Response.json(await reviewSample(text, data.get("locale") === "en" ? "en" : "it", request.signal), { headers });
  } catch (caught) {
    if (caught instanceof ManuscriptPreflightError) return error(caught.code, 422);
    if (caught instanceof ReviewError) return error(caught.message, 503);
    return error("PROVIDER", 502);
  } finally { active.delete(user.id); }
}
