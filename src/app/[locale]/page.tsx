import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { HomeGuide } from "@/components/home-guide";
import { HomeFeatures } from "@/components/home-features";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HeroPrimaryCta } from "@/components/hero-primary-cta";
import { Button } from "@/components/ui/button";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <div className="bookr-home relative isolate min-h-screen">
      <div className="home-atmosphere" aria-hidden="true"><span /><span /></div>
      <SiteHeader />
      <main>
        <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10">
            <p className="home-editorial-note">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-3xl font-serif text-6xl font-semibold leading-[.92] tracking-[-.045em] text-ink sm:text-7xl lg:text-[5.8rem]">
              {t("title")}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/65">{t("subtitle")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <HeroPrimaryCta />
            </div>
        <nav className="home-hero-nav" aria-label={locale === "en" ? "Page navigation" : "Navigazione della pagina"}>
          <div>
            <a href="#metodo">{locale === "en" ? "Features" : "Funzionalità"}</a>
            <a href="#come-funziona">{locale === "en" ? "How it works" : "Come funziona"}</a>
            <a href="#faq">FAQ</a>
            <a href="https://github.com/lordsyncrus/bookr" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          </div>
        </nav>
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
        </section>

        <HomeFeatures />
        <HomeGuide />
      </main>
      <SiteFooter />
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
  const before = original.split(" ");
  const after = proposal.split(" ");
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  const opening = before.slice(0, prefix).join(" ");
  const ending = suffix ? before.slice(-suffix).join(" ") : "";

  return (
    <article className="home-review-card manuscript-preview hexclave-private" aria-label={chapter}>
      <div className="draft-running-head">
        <span>BOOKR / {originalLabel}</span>
        <span>{chapter}</span>
      </div>
      <div className="draft-body">
        <div className="draft-category"><span aria-hidden="true" />{category}</div>
        <p className="draft-original">
          {opening}{" "}<del>{before.slice(prefix, before.length - suffix).join(" ")}</del>{" "}{ending}
        </p>
        <div className="draft-correction">
          <svg className="draft-proof-mark" width="40" height="54" viewBox="0 0 40 54" fill="none" aria-hidden="true">
            <path d="M30 3C5 8 4 27 27 39M16 39l13 2-3-13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="draft-note-label">{proposalLabel}</p>
          <p className="draft-proposal">{opening}{" "}<ins>{after.slice(prefix, after.length - suffix).join(" ")}</ins>{" "}{ending}</p>
        </div>
        <p className="draft-reason">{reason}</p>
        <div className="draft-actions">
          <Button variant="ghost" className="text-ink/60">{reject}</Button>
          <Button className="bg-forest text-white hover:bg-forest/90"><Check size={15} aria-hidden="true" />{approve}</Button>
        </div>
      </div>
      <div className="draft-folio" aria-hidden="true"><span />18<span /></div>
    </article>
  );
}
