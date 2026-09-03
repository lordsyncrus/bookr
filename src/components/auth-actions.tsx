"use client";

import { useState, useTransition } from "react";
import { CircleUserRound, LogIn, LogOut, Sparkles } from "lucide-react";
import { useHexclaveApp, useUser } from "@hexclave/next";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            disabled={pending}
            aria-label={`${t("account")}: ${user.displayName || user.primaryEmail || "Bookr"}`}
            className="inline-flex size-11 items-center justify-center rounded-full p-0 outline-none transition-colors hover:bg-coral/10 focus-visible:ring-3 focus-visible:ring-coral/30 data-popup-open:bg-coral/10"
          >
            <UserAvatar user={user} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-2">
            <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5">
              <UserAvatar user={user} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {user.displayName || t("account")}
                </span>
                {user.primaryEmail ? (
                  <span className="block truncate text-xs font-normal text-ink/50">{user.primaryEmail}</span>
                ) : null}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="px-2 py-2" onClick={() => run(() => app.redirectToAccountSettings())}>
              <CircleUserRound />
              {t("accountSettings")}
            </DropdownMenuItem>
            <DropdownMenuItem className="px-2 py-2" onClick={() => run(() => app.redirectToSignOut())}>
              <LogOut />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

function UserAvatar({
  user,
  size = "default",
}: {
  user: { displayName: string | null; primaryEmail: string | null; profileImageUrl: string | null };
  size?: "default" | "sm";
}) {
  const initials = (user.displayName || user.primaryEmail || "BR")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Avatar size={size} className="bg-ink text-paper ring-2 ring-paper shadow-sm">
      {user.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt="" /> : null}
      <AvatarFallback className="bg-ink font-serif font-semibold text-paper">{initials}</AvatarFallback>
    </Avatar>
  );
}
