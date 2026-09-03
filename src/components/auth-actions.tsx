"use client";

import { useState, useTransition } from "react";
import { LogIn, LogOut, Sparkles } from "lucide-react";
import { useHexclaveApp, useUser } from "@hexclave/next";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function AuthActions() {
  const app = useHexclaveApp();
  const user = useUser();
  const t = useTranslations("nav");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setError(t("authError"));
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="hidden text-xs text-destructive sm:block">{error}</span> : null}
      {user ? (
        <Button variant="ghost" disabled={pending} onClick={() => run(() => app.redirectToSignOut())}>
          <LogOut data-icon="inline-start" />
          {t("signOut")}
        </Button>
      ) : (
        <>
          <Button variant="ghost" disabled={pending} onClick={() => run(() => app.redirectToSignIn())}>
            <LogIn data-icon="inline-start" />
            {t("signIn")}
          </Button>
          <Button disabled={pending} onClick={() => run(() => app.redirectToSignUp())}>
            <Sparkles data-icon="inline-start" />
            {t("start")}
          </Button>
        </>
      )}
    </div>
  );
}
