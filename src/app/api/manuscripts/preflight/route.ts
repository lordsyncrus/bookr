import { NextResponse } from "next/server";

import { hexclaveServerApp } from "@/hexclave/server";
import { analyseManuscript, ManuscriptPreflightError } from "@/lib/manuscript-preflight.server";
import { MAX_MANUSCRIPT_BYTES, type PreflightError, type PreflightErrorCode } from "@/lib/manuscript-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await hexclaveServerApp.getUser({ tokenStore: request, or: "throw" });
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_MANUSCRIPT_BYTES + 1024 * 1024) {
      return errorResponse("FILE_TOO_LARGE", 413);
    }

    const formData = await request.formData();
    const manuscript = formData.get("manuscript");

    if (!(manuscript instanceof File)) return errorResponse("MISSING_FILE", 400);
    if (manuscript.size > MAX_MANUSCRIPT_BYTES) return errorResponse("FILE_TOO_LARGE", 413);

    const result = await analyseManuscript(manuscript);
    return NextResponse.json(result, { headers: privateHeaders() });
  } catch (error) {
    if (error instanceof ManuscriptPreflightError) {
      const status = error.code === "UNSUPPORTED_FORMAT" ? 415 : 422;
      return errorResponse(error.code, status);
    }

    return errorResponse("PARSE_FAILED", 422);
  }
}

function errorResponse(error: PreflightErrorCode, status: number) {
  return NextResponse.json<PreflightError>({ error }, { status, headers: privateHeaders() });
}

function privateHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}
