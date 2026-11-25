"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLang } from "@/components/language-provider";
import { BrandLogoGraphic } from "@/components/brand-logo";
import { sanitizeSafeRedirectPath } from "@/lib/security";
import { Loader2, ArrowUpRight, ArrowRight } from "lucide-react";

export function LoginForm() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-[100svh] flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function withTrailingSlash(path: string): string {
  const [pathname, query] = path.split("?");
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return query ? `${normalized}?${query}` : normalized;
}

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang, t, isRTL } = useLang();
  const fa = lang === "fa";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fd.get("phone"),
          password: fd.get("password"),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.error ?? (fa ? "خطا در ورود" : "Sign-in failed"));
        return;
      }

      const fallbackDest = sanitizeSafeRedirectPath(data.redirect, "/dashboard/");
      const safeNext = params.get("next")
        ? sanitizeSafeRedirectPath(params.get("next"), fallbackDest)
        : null;
      // اگر هنرجو لاگین کرده و ?next=/dashboard بود، مستقیم به پنل هنرجو برود
      const chosen =
        fallbackDest === "/panel/" && safeNext?.startsWith("/dashboard")
          ? "/panel/"
          : safeNext || fallbackDest;

      window.dispatchEvent(new Event("neeleh-auth-changed"));
      router.push(withTrailingSlash(chosen));
      router.refresh();
    } catch {
      setError(
        fa
          ? "ارتباط برقرار نشد — دوباره تلاش کنید."
          : "Connection failed — please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100svh] flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 lg:px-12 py-6 border-b border-border">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
        >
          {isRTL ? (
            <ArrowRight className="size-3.5" aria-hidden />
          ) : (
            <ArrowUpRight className="size-3.5 rotate-180" aria-hidden />
          )}
          {isRTL ? "بازگشت به سایت" : "Back to site"}
        </Link>
        <div className="flex items-center gap-2">
          <BrandLogoGraphic
            maxHeight={32}
            fallback={
              <span className="grid size-7 place-items-center rounded-md bg-foreground text-background text-sm font-bold">
                {fa ? "ن" : "N"}
              </span>
            }
          />
          <span className="text-sm font-medium tracking-tight">
            {fa ? "آکادمی نیله" : "Neeleh Academy"}
          </span>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between px-12 py-16 border-e border-border bg-secondary/30">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              [{fa ? " ورود " : " Sign in "}]
            </p>
            <h1
              className={`font-medium tracking-[-0.04em] leading-[0.9] text-[clamp(3rem,8vw,8rem)] ${
                isRTL ? "fa-serif" : "font-serif-display italic"
              }`}
            >
              {t.brand.heroLine1}
            </h1>
            <h1
              className={`font-medium tracking-[-0.04em] leading-[0.9] text-[clamp(3rem,8vw,8rem)] text-muted-foreground ${
                isRTL ? "fa-serif" : "font-serif-display italic"
              }`}
            >
              {t.brand.heroLine2}
            </h1>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-md">
            {t.hero.tagline}{" "}
            <span
              className={`text-foreground ${
                isRTL ? "fa-serif" : "font-serif-display italic"
              }`}
            >
              {t.hero.taglineAccent}
            </span>
          </p>
        </section>

        <section className="flex items-center justify-center px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
          <div className="w-full max-w-md">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              [ {isRTL ? "ورود به پنل" : "Sign in"} ]
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] mb-2">
              {isRTL ? "ورود به آکادمی نیله" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
              {isRTL
                ? "برای ورود به پنل مدیریت یا پنل هنرجویی، شماره موبایل و رمز عبور خود را وارد کنید."
                : "Enter your mobile number and password to access your dashboard."}
            </p>

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2"
                >
                  {isRTL ? "شماره موبایل" : "Mobile number"}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  required
                  dir="ltr"
                  className="w-full bg-transparent border-b border-border py-3 text-lg tracking-tight outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60 text-start"
                  placeholder="0912 345 6789"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2"
                >
                  {isRTL ? "رمز عبور" : "Password"}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  dir="ltr"
                  className="w-full bg-transparent border-b border-border py-3 text-lg tracking-tight outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60 text-start"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full flex min-h-[52px] items-center justify-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium uppercase tracking-[0.12em] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {isRTL ? "ورود" : "Sign in"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground leading-relaxed flex flex-col gap-3">
              <p>
                {isRTL
                  ? "برای ثبت‌نام در دوره، از صفحه دوره اقدام کنید. حساب کاربری به‌صورت خودکار ساخته می‌شود."
                  : "To register, sign up from a course page — your account is created automatically."}
              </p>
              <Link
                href="/courses/"
                className="inline-flex items-center gap-1.5 text-foreground font-medium hover:opacity-75 transition-opacity w-fit"
              >
                {isRTL ? "مشاهده و ثبت‌نام در دوره‌ها" : "Browse & register for courses"}
                <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
