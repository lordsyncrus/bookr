import { NextResponse } from "next/server";

import { hexclaveServerApp } from "@/hexclave/server";

export async function POST(request: Request) {
  const user = await hexclaveServerApp.getUser({ tokenStore: request, or: "throw" });

  return NextResponse.json(
    { accepted: true, userId: user.id },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
