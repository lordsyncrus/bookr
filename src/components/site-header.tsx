import { Suspense } from "react";
import { BookOpenText } from "lucide-react";

import { AuthActions } from "./auth-actions";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-ink text-paper shadow-sm">
          <BookOpenText className="size-5" />
        </span>
        <span className="font-serif text-2xl font-semibold tracking-tight">BookReview</span>
      </div>
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <Suspense fallback={<div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />}>
          <AuthActions />
        </Suspense>
      </div>
    </header>
  );
}
