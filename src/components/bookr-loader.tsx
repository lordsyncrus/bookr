"use client";

import Image from "next/image";
import { useLocale } from "next-intl";

export function BookrLoader({ compact = false, label }: { compact?: boolean; label?: string }) {
  const en = useLocale() === "en";
  return (
    <div className={compact ? "bookr-loader bookr-loader-compact" : "bookr-loader"} role="status" aria-live="polite">
      <div className="bookr-loader-book" aria-hidden="true"><span /><span /><span /></div>
      {!compact && <Image src="/bookr-logo-v2.svg" width={110} height={34} alt="Bookr" className="h-8 w-auto" />}
      <span className={compact ? "sr-only" : "bookr-loader-label"}>{label || (en ? "Loading…" : "Caricamento…")}</span>
    </div>
  );
}
