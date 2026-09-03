import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignUpExperience } from "@/components/auth/sign-up-experience";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signUp");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignUpExperience />;
}
