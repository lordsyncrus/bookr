"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  BookOpenText,
  Check,
  Clock3,
  Coins,
  FileText,
  FileUp,
  Languages,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Type,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MAX_MANUSCRIPT_BYTES, type ManuscriptPreflight, type PreflightError } from "@/lib/manuscript-types";

type IntakeState =
  | { status: "idle" }
  | { status: "analysing"; fileName: string }
  | { status: "ready"; result: ManuscriptPreflight }
  | { status: "error"; message: string };

export function ManuscriptIntake() {
  const t = useTranslations("intake");
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<IntakeState>({ status: "idle" });

  async function submit(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_MANUSCRIPT_BYTES) {
      setState({ status: "error", message: t("errors.FILE_TOO_LARGE") });
      return;
    }

    setState({ status: "analysing", fileName: file.name });
    const formData = new FormData();
    formData.set("manuscript", file);

    try {
      const response = await fetch("/api/manuscripts/preflight", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const payload = (await response.json()) as ManuscriptPreflight | PreflightError;

      if (!response.ok || "error" in payload) {
        const code = "error" in payload ? payload.error : "PARSE_FAILED";
        setState({ status: "error", message: t(`errors.${code}`) });
        return;
      }

      setState({ status: "ready", result: payload });
    } catch {
      setState({ status: "error", message: t("errors.PARSE_FAILED") });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function reset() {
    setState({ status: "idle" });
  }

  return (
    <Card className="hexclave-private border-ink/10 bg-white/75 shadow-xl shadow-ink/5">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle className="font-serif text-3xl">{t("title")}</CardTitle>
        <Badge variant="outline" className="border-forest/20 bg-forest/5 text-forest">
          <ShieldCheck className="size-3.5" />
          {t("private")}
        </Badge>
      </CardHeader>
      <CardContent>
        {state.status === "ready" ? (
          <PreflightResult result={state.result} locale={locale} onReset={reset} />
        ) : (
          <div
            className={cn(
              "grid min-h-80 place-items-center rounded-2xl border border-dashed border-ink/20 bg-paper/70 p-8 text-center transition-colors",
              dragging && "border-coral bg-coral/5",
            )}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void submit(event.dataTransfer.files[0]);
            }}
          >
            <div className="max-w-md">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-coral/10 text-coral">
                {state.status === "analysing" ? <LoaderCircle className="size-6 animate-spin" /> : <FileUp className="size-6" />}
              </span>
              <h2 className="mt-5 text-lg font-semibold text-ink">
                {state.status === "analysing" ? t("analysing") : t("dropTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/50">
                {state.status === "analysing" ? state.fileName : t("formats")}
              </p>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept=".docx,.txt,.md,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-label={t("choose")}
                onChange={(event) => void submit(event.target.files?.[0])}
              />
              <Button className="mt-6" disabled={state.status === "analysing"} onClick={() => inputRef.current?.click()}>
                <FileUp data-icon="inline-start" />
                {t("choose")}
              </Button>
              <p className="mt-4 text-xs leading-5 text-ink/40">{t("retention")}</p>
              {state.status === "error" ? (
                <Alert variant="destructive" className="mt-5 text-left">
                  <AlertCircle />
                  <AlertTitle>{t("errorTitle")}</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreflightResult({ result, locale, onReset }: { result: ManuscriptPreflight; locale: string; onReset: () => void }) {
  const t = useTranslations("intake");
  const number = new Intl.NumberFormat(locale);
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const language = result.metrics.language === "undetermined" ? t("undetermined") : t(`languages.${result.metrics.language}`);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-forest px-5 py-5 text-paper">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10"><FileText className="size-5" /></span>
          <div className="min-w-0">
            <p className="truncate font-medium">{result.file.name}</p>
            <p className="mt-1 text-xs text-paper/60">{formatBytes(result.file.sizeBytes, locale)} · {result.file.extension.toUpperCase()}</p>
          </div>
        </div>
        <Badge className="border-white/10 bg-white/10 text-paper"><Check className="size-3.5" />{t("ready")}</Badge>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Type} label={t("words")} value={number.format(result.metrics.words)} />
        <Metric icon={BookOpenText} label={t("chapters")} value={number.format(result.metrics.chapters)} hint={result.metrics.structureDetected ? t("detected") : t("notDetected")} />
        <Metric icon={Languages} label={t("language")} value={language} />
        <Metric icon={Clock3} label={t("time")} value={t("minutes", result.estimate.durationMinutes)} />
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl border border-ink/10 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Coins className="size-4 text-coral" />{t("aiBudget")}</div>
          <p className="mt-2 font-serif text-3xl font-semibold text-ink">
            {currency.format(result.estimate.aiCostEur.min)}–{currency.format(result.estimate.aiCostEur.max)}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink/45">
            {t("budgetNote", { tokens: number.format(result.estimate.pipelineTokens) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:max-w-64 md:justify-end">
          {result.reviewTypes.map((type) => <Badge key={type} variant="outline">{t(`reviewTypes.${type}`)}</Badge>)}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onReset}><RotateCcw data-icon="inline-start" />{t("another")}</Button>
        <Button disabled title={t("comingSoon")}>{t("createProject")}</Button>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Type; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-paper p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-ink/40"><Icon className="size-3.5" />{label}</div>
      <p className="mt-3 font-serif text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/40">{hint}</p> : null}
    </div>
  );
}

function formatBytes(bytes: number, locale: string) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}
