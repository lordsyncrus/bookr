import { HexclaveTheme, SignIn, SignUp } from "@hexclave/next";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";

// Hexclave parses literal colors; CSS variables and oklch are not supported.
const authColors = {
  background: "#fffefa",
  foreground: "#263b32",
  card: "#fffefa",
  cardForeground: "#263b32",
  primary: "#2c503d",
  primaryForeground: "#ffffff",
  secondary: "#f0f2ea",
  secondaryForeground: "#263b32",
  muted: "#f0f2ea",
  mutedForeground: "#64705e",
  accent: "#e6ebdf",
  accentForeground: "#263b32",
  border: "#dce1d7",
  input: "#dce1d7",
  ring: "#577b55",
};

export function AuthExperience({ mode }: { mode: "sign-in" | "sign-up" }) {
  const t = useTranslations("signUp");

  return (
    <main className="flex min-h-dvh flex-col bg-paper font-sans text-ink">
      <header className="flex justify-end px-5 py-4 sm:px-8">
        <LanguageSwitcher />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:py-12">
        <Link href="/" className="mb-8 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-forest">
          <Image src="/bookr-logo-v2.svg" alt="Bookr" width={132} height={42} loading="eager" className="h-10 w-auto" />
        </Link>
        <section aria-label={mode === "sign-in" ? t("signIn") : t("createAccount")} className="hexclave-private w-full max-w-[28rem] rounded-2xl border border-ink/10 bg-[#fffefa] p-5 sm:p-8">
          <HexclaveTheme theme={{ light: authColors, dark: authColors, radius: "0.5rem" }}>
            {mode === "sign-in" ? <SignIn automaticRedirect /> : <SignUp automaticRedirect extraInfo={t("terms")} />}
          </HexclaveTheme>
        </section>
      </div>
      <footer className="px-5 py-6 text-center text-xs leading-5 text-ink/60">
        {t("privacy")}
      </footer>
    </main>
  );
}
