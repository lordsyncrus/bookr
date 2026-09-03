import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HexclaveProvider, HexclaveTheme } from "@hexclave/next";

import { TooltipProvider } from "@/components/ui/tooltip";
import { hexclaveServerApp } from "@/hexclave/server";
import { routing } from "@/i18n/routing";

import "../globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "BookReview — Il tuo libro, ancora più tuo",
    template: "%s · BookReview",
  },
  description:
    "Revisione editoriale assistita dall'AI che protegge la voce dell'autore.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <HexclaveProvider app={hexclaveServerApp}>
            <HexclaveTheme>
              <TooltipProvider>{children}</TooltipProvider>
            </HexclaveTheme>
          </HexclaveProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
