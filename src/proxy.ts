import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { normalizeAuthReturn } from "./lib/auth-return";

const localize = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const normalized = normalizeAuthReturn(new URL(request.url));
  if (normalized) return NextResponse.redirect(normalized);
  return localize(request);
}

export const config = {
  matcher: "/((?!api|healthz|_next|_vercel|.*\\..*).*)",
};
