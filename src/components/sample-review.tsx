"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { applyFindings, type ReviewResult } from "@/lib/review-types";

export function SampleReview({ file }: { file: File }) {
  const t = useTranslations("sampleReview");
  const locale = useLocale();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [decisions, setDecisions] = useState<Record<number, "approved" | "rejected">>({});
  async function run() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError("");
    const data = new FormData(); data.set("manuscript", file); data.set("locale", locale);
    try {
      const response = await fetch("/api/reviews", { method: "POST", body: data, credentials: "same-origin", signal: AbortSignal.timeout(110_000) });
      const payload = await response.json();
      if (!response.ok) { setError(t.has(`errors.${payload.error}`) ? t(`errors.${payload.error}`) : t("errors.PROVIDER")); return; }
      setResult(payload); setDecisions({});
    } catch { setError(t("errors.PROVIDER")); }
    finally { setBusy(false); locked.current = false; }
  }
  function download() {
    if (!result) return;
    const text = applyFindings(result.sample, result.findings.filter((_, index) => decisions[index] === "approved"));
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "reviewed-sample.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="hexclave-private mt-6 border-t border-ink/10 pt-6" aria-busy={busy}>
    <h3 className="font-serif text-2xl text-ink">{t("title")}</h3>
    <p className="mt-2 text-sm leading-6 text-ink/60">{t("description")}</p>
    {!result && <Button className="mt-4" disabled={busy} onClick={() => void run()}>{busy ? t("working") : t("start")}</Button>}
    <div aria-live="polite">{busy && <p className="mt-3 text-sm text-ink/60">{t("wait")}</p>}</div>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {result && <div className="mt-5 space-y-5">
      <p className="text-sm text-ink/60">{t("coverage", { count: result.sample.length, total: result.totalCharacters })} · {result.model}</p>
      {result.discarded > 0 && <p role="status" className="text-sm text-ink/60">{t("discarded", { count: result.discarded })}</p>}
      {!result.findings.length && <p>{t("empty")}</p>}
      {result.findings.map((finding, index) => <article key={index} className="rounded-xl border border-ink/15 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-forest">{index + 1} · {t(finding.category)}</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div><h4 className="text-xs text-ink/50">{t("original")}</h4><p className="mt-2 whitespace-pre-wrap break-words font-serif text-lg">{finding.original}</p></div>
          <div><h4 className="text-xs text-forest">{t("suggested")}</h4><p className="mt-2 whitespace-pre-wrap break-words font-serif text-lg text-forest">{finding.suggested || t("deletion")}</p></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/65">{finding.reason}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" variant={decisions[index] === "approved" ? "default" : "outline"} aria-pressed={decisions[index] === "approved"} onClick={() => setDecisions(d => ({ ...d, [index]: "approved" }))}>{t("approve")}</Button>
          <Button size="sm" variant={decisions[index] === "rejected" ? "default" : "outline"} aria-pressed={decisions[index] === "rejected"} onClick={() => setDecisions(d => ({ ...d, [index]: "rejected" }))}>{t("reject")}</Button>
          <span role="status" className="text-xs text-ink/50">{t(decisions[index] || "pending")}</span>
        </div>
      </article>)}
      <Button variant="outline" onClick={download}>{t("download")}</Button>
      <p className="text-xs leading-5 text-ink/50">{t("retention")}</p>
    </div>}
  </section>;
}
