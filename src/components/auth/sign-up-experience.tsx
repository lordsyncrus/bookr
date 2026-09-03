"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BookOpenText,
  Check,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getPasswordError } from "@hexclave/shared/dist/helpers/password";
import { useHexclaveApp, useUser } from "@hexclave/next";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";

type PendingAction = "credential" | "magic-link" | "otp" | "oauth" | null;

type FieldErrorProps = {
  id: string;
  message: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function SignUpExperience() {
  const app = useHexclaveApp();
  const user = useUser({ includeRestricted: true });
  const project = app.useProject();
  const t = useTranslations("signUp");
  const [redirectError, setRedirectError] = useState(false);

  useEffect(() => {
    if (!user) return;

    const redirect = user.isRestricted
      ? app.redirectToOnboarding({ replace: true })
      : app.redirectToAfterSignUp({ replace: true });

    void redirect.catch(() => setRedirectError(true));
  }, [app, user]);

  if (user) {
    return (
      <AuthCanvas>
        <div className="mx-auto flex min-h-[30rem] max-w-lg flex-col items-center justify-center px-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-forest/10 text-forest">
            {redirectError ? <ShieldCheck className="size-6" /> : <LoaderCircle className="size-6 animate-spin" />}
          </span>
          <h1 className="mt-6 font-serif text-4xl font-semibold text-ink">
            {redirectError ? t("redirectErrorTitle") : t("redirectTitle")}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink/55">
            {redirectError ? t("redirectErrorBody") : t("redirectBody")}
          </p>
          {redirectError ? (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => void app.redirectToSignOut()}>{t("signOut")}</Button>
              <Button onClick={() => void app.redirectToHome()}>{t("goHome")}</Button>
            </div>
          ) : null}
        </div>
      </AuthCanvas>
    );
  }

  if (!project.config.signUpEnabled) {
    return (
      <AuthCanvas>
        <Alert className="mx-auto max-w-lg border-coral/20 bg-coral/5">
          <LockKeyhole />
          <AlertTitle>{t("disabledTitle")}</AlertTitle>
          <AlertDescription>{t("disabledBody")}</AlertDescription>
        </Alert>
        <SignInPrompt />
      </AuthCanvas>
    );
  }

  const hasOAuth = project.config.oauthProviders.length > 0;
  const hasCredential = project.config.credentialEnabled;
  const hasMagicLink = project.config.magicLinkEnabled;
  const hasAnyMethod = hasOAuth || hasCredential || hasMagicLink;

  return (
    <AuthCanvas>
      <div className="hexclave-private mx-auto w-full max-w-[30rem]">
        <Badge variant="outline" className="rounded-full border-ink/15 bg-paper px-3 py-1 text-ink/65">
          <span className="mr-2 size-1.5 rounded-full bg-coral" />
          {t("eyebrow")}
        </Badge>
        <h1 className="mt-5 font-serif text-5xl font-semibold leading-none tracking-[-.035em] text-ink">
          {t("title")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink/55">
          {t("already")} {" "}
          <button className="font-semibold text-ink underline decoration-coral/50 underline-offset-4 hover:decoration-coral" onClick={() => void app.redirectToSignIn()}>
            {t("signIn")}
          </button>
        </p>

        {!hasAnyMethod ? (
          <Alert variant="destructive" className="mt-8">
            <LockKeyhole />
            <AlertTitle>{t("noMethodsTitle")}</AlertTitle>
            <AlertDescription>{t("noMethodsBody")}</AlertDescription>
          </Alert>
        ) : (
          <div className="mt-8">
            {hasOAuth ? <OAuthMethods providers={project.config.oauthProviders} /> : null}
            {hasOAuth && (hasCredential || hasMagicLink) ? <OrSeparator /> : null}

            {hasCredential && hasMagicLink ? (
              <Tabs defaultValue="magic-link">
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-ink/[.055] p-1">
                  <TabsTrigger value="magic-link" className="rounded-lg py-2">{t("emailCodeTab")}</TabsTrigger>
                  <TabsTrigger value="password" className="rounded-lg py-2">{t("passwordTab")}</TabsTrigger>
                </TabsList>
                <TabsContent value="magic-link" className="pt-6"><MagicLinkFlow /></TabsContent>
                <TabsContent value="password" className="pt-6"><CredentialFlow /></TabsContent>
              </Tabs>
            ) : hasMagicLink ? (
              <MagicLinkFlow />
            ) : hasCredential ? (
              <CredentialFlow />
            ) : null}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-ink/40">{t("terms")}</p>
      </div>
    </AuthCanvas>
  );
}

function CredentialFlow() {
  const app = useHexclaveApp();
  const t = useTranslations("signUp");
  const [pending, setPending] = useState<PendingAction>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [repeatError, setRepeatError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const passwordRepeat = String(form.get("passwordRepeat") ?? "");

    const nextEmailError = emailPattern.test(email) ? null : t("invalidEmail");
    const sdkPasswordError = getPasswordError(password);
    const nextPasswordError = sdkPasswordError
      ? t("passwordLength")
      : null;
    const nextRepeatError = password === passwordRepeat ? null : t("passwordMismatch");

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setRepeatError(nextRepeatError);
    if (nextEmailError || nextPasswordError || nextRepeatError) return;

    setPending("credential");
    try {
      const result = await app.signUpWithCredential({ email, password });
      if (result.status === "error") {
        setEmailError(readableError(result.error, t("genericError")));
        setPending(null);
      }
    } catch {
      setEmailError(t("genericError"));
      setPending(null);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="grid gap-4">
      <Field id="credential-email" label={t("email")} error={emailError}>
        <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
        <Input id="credential-email" name="email" type="email" autoComplete="email" aria-invalid={!!emailError} aria-describedby="credential-email-error" className="h-11 rounded-xl bg-white/70 pl-10" placeholder={t("emailPlaceholder")} onChange={() => setEmailError(null)} />
      </Field>
      <Field id="credential-password" label={t("password")} error={passwordError} hint={t("passwordHint")}>
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
        <Input id="credential-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!passwordError} aria-describedby={passwordError ? "credential-password-error" : "credential-password-help"} className="h-11 rounded-xl bg-white/70 pl-10" onChange={() => setPasswordError(null)} />
      </Field>
      <Field id="credential-password-repeat" label={t("repeatPassword")} error={repeatError}>
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
        <Input id="credential-password-repeat" name="passwordRepeat" type="password" autoComplete="new-password" aria-invalid={!!repeatError} aria-describedby="credential-password-repeat-error" className="h-11 rounded-xl bg-white/70 pl-10" onChange={() => setRepeatError(null)} />
      </Field>
      <Button type="submit" size="lg" className="mt-2 h-11 w-full rounded-xl" disabled={pending !== null}>
        {pending === "credential" ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
        {pending === "credential" ? t("creating") : t("createAccount")}
        {pending !== "credential" ? <ArrowRight data-icon="inline-end" /> : null}
      </Button>
    </form>
  );
}

function MagicLinkFlow() {
  const app = useHexclaveApp();
  const t = useTranslations("signUp");
  const [nonce, setNonce] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!emailPattern.test(normalizedEmail)) {
      setEmailError(t("invalidEmail"));
      return;
    }

    setEmailError(null);
    setPending("magic-link");
    try {
      const result = await app.sendMagicLinkEmail(normalizedEmail);
      if (result.status === "error") {
        setEmailError(readableError(result.error, t("genericError")));
      } else {
        setNonce(result.data.nonce);
      }
    } catch {
      setEmailError(t("genericError"));
    } finally {
      setPending(null);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nonce || otp.length !== 6) {
      setOtpError(t("invalidCode"));
      return;
    }

    setOtpError(null);
    setPending("otp");
    try {
      const result = await app.signInWithMagicLink(otp + nonce);
      if (result.status === "error") {
        setOtpError(readableError(result.error, t("invalidCode")));
        setOtp("");
        setPending(null);
      }
    } catch {
      setOtpError(t("genericError"));
      setPending(null);
    }
  }

  if (nonce) {
    return (
      <form onSubmit={(event) => void verifyCode(event)} className="grid justify-items-center gap-5 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-coral/10 text-coral"><Mail className="size-5" /></span>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">{t("checkEmailTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/50">{t("checkEmailBody", { email })}</p>
        </div>
        <InputOTP maxLength={6} value={otp} onChange={(value) => { setOtp(value.replace(/\D/gu, "")); setOtpError(null); }} disabled={pending !== null} aria-label={t("codeLabel")}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="size-11 bg-white/70 text-lg" />)}
          </InputOTPGroup>
        </InputOTP>
        <FieldError id="otp-error" message={otpError} />
        <Button type="submit" size="lg" className="h-11 w-full rounded-xl" disabled={pending !== null || otp.length !== 6}>
          {pending === "otp" ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
          {pending === "otp" ? t("verifying") : t("verifyCode")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setNonce(null); setOtp(""); setOtpError(null); }} disabled={pending !== null}>
          <ArrowLeft data-icon="inline-start" />{t("back")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void sendCode(event)} noValidate className="grid gap-4">
      <Field id="magic-email" label={t("email")} error={emailError} hint={t("codeHint")}>
        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
        <Input id="magic-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(null); }} aria-invalid={!!emailError} aria-describedby={emailError ? "magic-email-error" : "magic-email-help"} className="h-11 rounded-xl bg-white/70 pl-10" placeholder={t("emailPlaceholder")} />
      </Field>
      <Button type="submit" size="lg" className="mt-2 h-11 w-full rounded-xl" disabled={pending !== null}>
        {pending === "magic-link" ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Mail data-icon="inline-start" />}
        {pending === "magic-link" ? t("sending") : t("sendCode")}
      </Button>
    </form>
  );
}

function OAuthMethods({ providers }: { providers: readonly { id: string }[] }) {
  const app = useHexclaveApp();
  const t = useTranslations("signUp");
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(providerId: string) {
    setError(null);
    setPendingProvider(providerId);
    try {
      await app.signInWithOAuth(providerId);
    } catch {
      setError(t("genericError"));
      setPendingProvider(null);
    }
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <Button key={provider.id} variant="outline" size="lg" className="h-11 w-full rounded-xl bg-white/70" disabled={pendingProvider !== null} onClick={() => void start(provider.id)}>
          {pendingProvider === provider.id ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : null}
          {t("continueWith", { provider: providerName(provider.id) })}
        </Button>
      ))}
      <FieldError id="oauth-error" message={error} />
    </div>
  );
}

function AuthCanvas({ children }: { children: React.ReactNode }) {
  const t = useTranslations("signUp");

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,color-mix(in_oklab,var(--coral)_12%,transparent),transparent_31%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[94rem] lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -bottom-44 -left-44 size-[32rem] rounded-full border border-paper/10" />
          <div className="absolute -bottom-28 -left-28 size-[24rem] rounded-full border border-paper/10" />
          <Link href="/" className="relative flex w-fit items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-paper text-ink"><BookOpenText className="size-5" /></span>
            <span className="font-serif text-2xl font-semibold">BookReview</span>
          </Link>
          <div className="relative max-w-lg pb-8">
            <p className="font-serif text-5xl font-medium leading-[1.05] tracking-[-.025em]">“{t("quote")}”</p>
            <div className="mt-10 grid gap-4 text-sm text-paper/65">
              {[t("value1"), t("value2"), t("value3")].map((item) => (
                <span key={item} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-paper/10"><Check className="size-3.5 text-coral" /></span>{item}</span>
              ))}
            </div>
          </div>
        </aside>
        <section className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between px-6 py-6 sm:px-10">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-ink/55 hover:text-ink lg:hidden"><BookOpenText className="size-5" />BookReview</Link>
            <span className="hidden text-xs font-semibold uppercase tracking-[.18em] text-ink/35 lg:block">{t("step")}</span>
            <LanguageSwitcher />
          </header>
          <div className="flex flex-1 items-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">{children}</div>
          <footer className="px-6 py-6 text-center text-xs text-ink/35 sm:px-10">{t("privacy")}</footer>
        </section>
      </div>
    </main>
  );
}

function SignInPrompt() {
  const app = useHexclaveApp();
  const t = useTranslations("signUp");
  return <div className="mt-6 text-center"><Button variant="outline" onClick={() => void app.redirectToSignIn()}>{t("goToSignIn")}</Button></div>;
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error: string | null; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm text-ink/75">{label}</Label>
      <div className="relative">{children}</div>
      {hint && !error ? <p id={`${id}-help`} className="text-xs text-ink/40">{hint}</p> : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: FieldErrorProps) {
  return message ? <p id={id} role="alert" className="text-xs font-medium text-destructive">{message}</p> : null;
}

function OrSeparator() {
  const t = useTranslations("signUp");
  return <div className="my-6 flex items-center gap-3 text-[.68rem] font-semibold uppercase tracking-[.16em] text-ink/35"><span className="h-px flex-1 bg-ink/10" />{t("orContinue")}<span className="h-px flex-1 bg-ink/10" /></div>;
}

function readableError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    if ("humanReadableMessage" in error && typeof error.humanReadableMessage === "string") return error.humanReadableMessage;
    if ("message" in error && typeof error.message === "string") return error.message;
  }
  return fallback;
}

function providerName(id: string) {
  return id.replace(/[-_]/gu, " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}
