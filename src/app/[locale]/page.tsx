import { ArrowRight, Check, FileText, ScanSearch, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <div className="min-h-screen overflow-hidden">
      <SiteHeader />
      <main>
        <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10">
            <Badge variant="outline" className="mb-7 rounded-full border-ink/15 bg-white/60 px-3 py-1 text-ink">
              <span className="mr-2 size-1.5 rounded-full bg-coral" />
              {t("eyebrow")}
            </Badge>
            <h1 className="max-w-3xl font-serif text-6xl font-semibold leading-[.92] tracking-[-.045em] text-ink sm:text-7xl lg:text-[5.8rem]">
              {t("title")}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/65">{t("subtitle")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" nativeButton={false} render={<Link href="/workspace" />}>
                {t("cta")}
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<a href="#metodo" />}>
                {t("secondaryCta")}
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink/60">
              {[t("proof1"), t("proof2"), t("proof3")].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-forest" /> {item}
                </span>
              ))}
            </div>
          </div>

          <ReviewPreview
            chapter={t("previewChapter")}
            category={t("previewCategory")}
            originalLabel={t("previewOriginalLabel")}
            original={t("previewOriginal")}
            proposalLabel={t("previewProposalLabel")}
            proposal={t("previewProposal")}
            reason={t("previewReason")}
            reject={t("previewReject")}
            approve={t("previewApprove")}
          />
          <div className="absolute -right-48 top-0 -z-10 size-[36rem] rounded-full bg-coral/10 blur-3xl" />
        </section>

        <section id="metodo" className="border-y border-ink/10 bg-white/55">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[.7fr_1.3fr] lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-coral">{t("methodEyebrow")}</p>
              <h2 className="mt-4 max-w-sm font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                {t("methodTitle")}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <MethodCard icon={FileText} index="01" title={t("step1Title")} body={t("step1Body")} />
              <MethodCard icon={ScanSearch} index="02" title={t("step2Title")} body={t("step2Body")} />
              <MethodCard icon={ShieldCheck} index="03" title={t("step3Title")} body={t("step3Body")} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ReviewPreview({
  chapter,
  category,
  originalLabel,
  original,
  proposalLabel,
  proposal,
  reason,
  reject,
  approve,
}: {
  chapter: string;
  category: string;
  originalLabel: string;
  original: string;
  proposalLabel: string;
  proposal: string;
  reason: string;
  reject: string;
  approve: string;
}) {
  return (
    <Card className="relative rotate-[1.2deg] overflow-hidden border-ink/10 bg-[#fffdf8] py-0 shadow-[0_28px_80px_-35px_rgba(31,36,33,.35)]">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div className="flex gap-1.5"><span className="size-2.5 rounded-full bg-coral/70" /><span className="size-2.5 rounded-full bg-amber-400/70" /><span className="size-2.5 rounded-full bg-forest/60" /></div>
        <span className="text-xs font-medium text-ink/45">{chapter}</span>
      </div>
      <CardContent className="hexclave-private grid gap-5 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <Badge className="bg-coral/10 text-coral">{category}</Badge>
          <span className="text-xs text-ink/40">BR—018</span>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">{originalLabel}</p>
          <p className="font-serif text-xl leading-relaxed text-ink/55 line-through decoration-coral/50">{original}</p>
        </div>
        <div className="rounded-2xl border border-forest/15 bg-forest/[.045] p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-forest">{proposalLabel}</p>
          <p className="font-serif text-2xl leading-relaxed text-ink">{proposal}</p>
        </div>
        <p className="text-sm leading-6 text-ink/55">{reason}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline">{reject}</Button>
          <Button className="bg-forest text-white hover:bg-forest/90">{approve}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodCard({ icon: Icon, index, title, body }: { icon: typeof FileText; index: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6">
      <div className="flex items-center justify-between"><Icon className="size-5 text-coral" /><span className="font-mono text-xs text-ink/35">{index}</span></div>
      <h3 className="mt-10 font-serif text-2xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/55">{body}</p>
    </div>
  );
}
