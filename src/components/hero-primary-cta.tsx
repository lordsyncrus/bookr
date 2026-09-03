"use client";

import { ArrowRight } from "lucide-react";
import { useUser } from "@hexclave/next";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function HeroPrimaryCta() {
  const user = useUser();
  const t = useTranslations("home");

  return (
    <Button size="lg" nativeButton={false} render={<Link href="/workspace" />}>
      {user ? t("dashboardCta") : t("cta")}
      <ArrowRight data-icon="inline-end" />
    </Button>
  );
}
