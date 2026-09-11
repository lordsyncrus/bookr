import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/auth-return.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function("exports", compiled)(loaded.exports);
const { normalizeAuthReturn } = loaded.exports;

test("breaks auth-page return loops across both locales and directions", () => {
  for (const page of ["/sign-in", "/sign-up", "/it/sign-in", "/en/sign-up"]) {
    for (const target of ["/sign-up", "/en/sign-in/", "https://bookr.test/it/sign-up"]) {
      const url = new URL(page, "https://bookr.test");
      url.searchParams.set("after_auth_return_to", target);
      url.searchParams.set("state", "preserve-me");
      const normalized = normalizeAuthReturn(url);
      assert.ok(normalized);
      assert.equal(normalized.searchParams.get("after_auth_return_to"), page.startsWith("/en/") ? "/en/workspace" : "/workspace");
      assert.equal(normalized.searchParams.get("state"), "preserve-me");
      assert.equal(normalizeAuthReturn(normalized), null);
    }
  }
});

test("preserves deep links, external callbacks and non-auth requests", () => {
  for (const target of ["/workspace?view=history", "https://auth.example/sign-in", "/oauth-callback?code=test", "http://["]) {
    const url = new URL("https://bookr.test/sign-in");
    url.searchParams.set("after_auth_return_to", target);
    assert.equal(normalizeAuthReturn(url), null);
  }
  assert.equal(normalizeAuthReturn(new URL("https://bookr.test/sign-in")), null);
  assert.equal(normalizeAuthReturn(new URL("https://bookr.test/workspace?after_auth_return_to=/sign-up")), null);
});
