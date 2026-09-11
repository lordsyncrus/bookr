import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("homeMenu");
  const linkClass = "rounded-sm text-sm text-ink/65 transition-colors hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest";

  return (
    <footer className="bg-paper">
      <div className="mx-auto w-full max-w-7xl px-6 pb-6 pt-12 lg:px-10">
        <div className="flex flex-col justify-between gap-8 pb-10 sm:flex-row sm:items-start">
          <div>
            <Link href="/" aria-label="Bookr — Home" className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest">
              <Image src="/bookr-logo-v2.svg" alt="Bookr" width={118} height={36} className="h-8 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-ink/60">{t("tagline")}</p>
          </div>
          <nav aria-label={t("navigation")} className="flex flex-wrap items-center gap-x-8 gap-y-4 sm:pt-2">
            <a href="#metodo" className={linkClass}>{nav("features")}</a>
            <a href="#come-funziona" className={linkClass}>{nav("how")}</a>
            <a href="#faq" className={linkClass}>FAQ</a>
            <a href="https://github.com/lordsyncrus/bookr" target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}>GitHub<ArrowUpRight size={16} aria-hidden="true" /></a>
            <Link href="/workspace" className={`${linkClass} inline-flex items-center gap-2 font-semibold`}>
              {t("workspace")}<ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5 text-xs text-ink/50">
          <p>© {new Date().getFullYear()} Bookr. {t("rights")}</p>
          <div className="flex items-center gap-2">
            <span>{t("language")}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
