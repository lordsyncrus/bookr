const authPath = /^\/(?:it\/|en\/)?sign-(?:in|up)\/?$/;

/** Auth screens are intermediate steps, never post-auth destinations. */
export function normalizeAuthReturn(url: URL): URL | null {
  if (!authPath.test(url.pathname)) return null;
  const returnTo = url.searchParams.get("after_auth_return_to");
  if (!returnTo) return null;

  let target: URL;
  try {
    target = new URL(returnTo, url);
  } catch {
    return null;
  }
  // Keep external callbacks and legitimate deep links under Hexclave's validation.
  if (target.origin !== url.origin || !authPath.test(target.pathname)) return null;

  const normalized = new URL(url);
  normalized.searchParams.set("after_auth_return_to", url.pathname.startsWith("/en/") ? "/en/workspace" : "/workspace");
  return normalized;
}
