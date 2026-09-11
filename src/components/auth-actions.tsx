"use client";

import { useState, useTransition } from "react";
import { CircleUserRound, LogIn, LogOut, Sparkles, Settings } from "lucide-react";
import { useHexclaveApp, useUser } from "@hexclave/next";
import { useLocale, useTranslations } from "next-intl";

import { PreferencesModal } from "@/components/account/preferences-modal";
import type { ManuscriptProject } from "@/lib/editor/types";
import { AccountSettingsModal } from "@/components/account/account-settings-modal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthActions({showIdentity=false, showSettings=false, showWorkspace=false, projects=[]}:{showIdentity?:boolean;showSettings?:boolean;showWorkspace?:boolean;projects?:ManuscriptProject[]}) {
  const app = useHexclaveApp();
  const user = useUser();
  const t = useTranslations("nav");
  const en=useLocale()==="en";
  const recordedCost = projects.reduce((total, project) => total + (project.analysis?.costUsd ?? project.review?.cost ?? 0) + (project.titlePlan?.cost ?? 0) + (project.writingCost ?? 0), 0);
  const formattedCost = new Intl.NumberFormat(en ? "en-US" : "it-IT", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(recordedCost);
  const [preferencesOpen,setPreferencesOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
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
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="hidden text-xs text-destructive sm:block">{error}</span> : null}
      {user && showWorkspace && <Link href="/workspace" className="mr-2 rounded-full bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest">{en ? "Open studio" : "Apri lo studio"}</Link>}
      {user && showSettings && <button type="button" onClick={()=>setPreferencesOpen(true)} aria-label={en?"User preferences":"Preferenze utente"} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-ink/5"><Settings size={18}/></button>}
      {user&&preferencesOpen&&<PreferencesModal projects={projects} onClose={()=>setPreferencesOpen(false)}/>}

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            disabled={pending}
            aria-label={`${t("account")}: ${user.displayName || user.primaryEmail || "Bookr"}`}
            className={`auth-account-trigger inline-flex items-center rounded-full outline-none transition-colors hover:bg-coral/10 focus-visible:ring-3 focus-visible:ring-coral/30 data-popup-open:bg-coral/10 ${showIdentity?"gap-3 py-1 pr-3 text-left max-w-[12rem] sm:max-w-[18rem]":"size-11 justify-center p-0"}`}
          >
            <UserAvatar user={user} />
            {showIdentity&&<span className="auth-account-name min-w-0 truncate text-sm font-medium">{user.displayName?.trim() || t("account")}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-2">
            <div className="flex items-center gap-3 px-2 py-2.5">
              <UserAvatar user={user} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {user.displayName || t("account")}
                </span>
                {user.primaryEmail ? (
                  <span className="block truncate text-xs font-normal text-ink/50">{user.primaryEmail}</span>
                ) : null}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="px-2 py-2" onClick={() => setSettingsOpen(true)}>
              <CircleUserRound />
              {t("accountSettings")}
            </DropdownMenuItem>
            {showSettings && <div className="hexclave-private mx-2 my-2 border-y border-ink/10 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink/60">{en ? "Total AI spend" : "Spesa AI totale"}</span>
                <strong className="font-semibold tabular-nums text-ink">{formattedCost}</strong>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-ink/45">{en ? "Latest analyses saved on this device; not a complete history." : "Ultime analisi salvate sul dispositivo; storico non completo."}</p>
            </div>}
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
      {user&&settingsOpen&&<AccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen}/>}
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
