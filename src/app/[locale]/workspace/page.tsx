"use client";

import { use } from "react";
import { ArrowLeft, BookOpenCheck, ChevronRight, LockKeyhole, Sparkles } from "lucide-react";
import { useUser } from "@hexclave/next";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ManuscriptIntake } from "@/components/manuscript-intake";
import { Progress } from "@/components/ui/progress";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  use(params);
  const t = useTranslations("workspace");
  const user = useUser({ or: "redirect" });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-6 pb-8 pt-2 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" nativeButton={false} render={<Link href="/" />}><ArrowLeft data-icon="inline-start" />{t("back")}</Button>
          <div className="flex items-center gap-2 text-sm text-ink/55"><LockKeyhole className="size-4 text-forest" />{t("private")}</div>
        </header>

      <section className="mt-12 grid gap-8 lg:grid-cols-[.68fr_1.32fr]">
        <div>
          <Badge variant="outline">{t("eyebrow")}</Badge>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-none text-ink">
            {user.displayName ? t("titleNamed", { name: user.displayName }) : t("title")}
          </h1>
          <p className="mt-5 max-w-md leading-7 text-ink/60">{t("subtitle")}</p>
        </div>

        <ManuscriptIntake />
      </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <PipelineCard icon={BookOpenCheck} title={t("memoryTitle")} body={t("memoryBody")} progress={100} />
          <PipelineCard icon={Sparkles} title={t("reviewTitle")} body={t("reviewBody")} progress={72} />
          <PipelineCard icon={ChevronRight} title={t("controlTitle")} body={t("controlBody")} progress={34} />
        </section>
      </main>
    </div>
  );
}

function PipelineCard({ icon: Icon, title, body, progress }: { icon: typeof Sparkles; title: string; body: string; progress: number }) {
  return (
    <Card className="border-ink/10 bg-paper">
      <CardContent>
        <Icon className="size-5 text-coral" />
        <h3 className="mt-8 font-serif text-2xl font-semibold">{title}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-ink/50">{body}</p>
        <Progress value={progress} className="mt-6" />
      </CardContent>
    </Card>
  );
}
