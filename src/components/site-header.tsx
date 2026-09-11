import { Suspense } from "react";
import Image from "next/image";

import { BookrLoader } from "./bookr-loader";
import { AuthActions } from "./auth-actions";
import { LanguageSwitcher } from "./language-switcher";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
      <Link href="/" aria-label="Bookr — Home" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-coral/60">
        <Image
          src="/bookr-logo-v2.svg"
          alt="Bookr"
          width={148}
          height={47}
          priority
          className="h-10 w-auto"
        />
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <LanguageSwitcher />
        <Suspense fallback={<BookrLoader compact />}>
          <AuthActions showIdentity showWorkspace />
        </Suspense>
      </div>
    </header>
  );
}
