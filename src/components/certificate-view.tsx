"use client";

import Link from "next/link";
import { useLang } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { localeDate, localeNumber } from "@/lib/format";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Printer,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export type CertificateViewData = {
  found: boolean;
  valid: boolean;
  revoked: boolean;
  certificateCode: string;
  studentName: string;
  studentNameEn: string | null;
  courseTitle: string;
  courseTitleEn: string | null;
  courseSlug: string;
  scorePercent: number;
  durationHrs: number;
  issuedAt: string;
};

export function CertificateView({ data }: { data: CertificateViewData }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  if (!data.found) {
    return (
      <main className="min-h-[100svh] flex items-center justify-center px-5 py-16">
        <div className="max-w-md w-full rounded-lg border border-border bg-card p-8 text-center space-y-4">
          <XCircle className="size-10 text-rose-600 mx-auto" />
          <h1 className="text-xl font-semibold">
            {fa ? "گواهینامه‌ای با این کد یافت نشد" : "Certificate Not Found"}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {fa
              ? "کد گواهینامه واردشده در سامانه ثبت و استعلام آکادمی معماری نیله وجود ندارد."
              : "This serial code is not registered in Neeleh Architecture Academy."}
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center rounded-md bg-foreground text-background px-5 text-xs font-medium"
          >
            {fa ? "بازگشت به صفحه اصلی" : "Back to Home"}
          </Link>
        </div>
      </main>
    );
  }

  function copyVerificationLink() {
    void navigator.clipboard.writeText(window.location.href);
    toast({
      title: fa ? "لینک استعلام گواهینامه کپی شد" : "Verification link copied",
    });
  }

  const issueFa = localeDate("fa", data.issuedAt);
  const issueEn = localeDate("en", data.issuedAt);

  return (
    <main className="min-h-[100svh] bg-[#f7f6f2] text-[#141414] py-8 sm:py-12 px-4 sm:px-8 print:bg-white print:p-0">
      {/* Top Action Bar (hidden when printing) */}
      <div className="mx-auto max-w-[960px] mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/panel/"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
        >
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" />
          <span>{fa ? "بازگشت به پنل هنرجو" : "Back to Portal"}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyVerificationLink}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3.5 text-xs font-medium hover:bg-neutral-50"
          >
            <Copy className="size-3.5" />
            <span>{fa ? "کپی لینک استعلام" : "Copy Verify URL"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-neutral-950 text-white px-4 text-xs font-medium hover:opacity-90"
          >
            <Printer className="size-3.5" />
            <span>{fa ? "چاپ / خروجی PDF" : "Print / Save PDF"}</span>
          </button>
        </div>
      </div>

      {/* Architectural Certificate Sheet */}
      <article className="mx-auto max-w-[960px] bg-[#fffefb] border border-neutral-300 shadow-sm p-4 sm:p-8 print:shadow-none print:border-neutral-800 print:max-w-none">
        <div className="relative border border-neutral-900 p-6 sm:p-12">
          {/* Architectural corner registration ticks */}
          <span className="absolute -top-1.5 -left-1.5 size-3 border-t-2 border-l-2 border-neutral-900" aria-hidden />
          <span className="absolute -top-1.5 -right-1.5 size-3 border-t-2 border-r-2 border-neutral-900" aria-hidden />
          <span className="absolute -bottom-1.5 -left-1.5 size-3 border-b-2 border-l-2 border-neutral-900" aria-hidden />
          <span className="absolute -bottom-1.5 -right-1.5 size-3 border-b-2 border-r-2 border-neutral-900" aria-hidden />

          <div className="border border-neutral-300 p-6 sm:p-10 space-y-10">
            {/* Header Row */}
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                  NEELEH ARCHITECTURE ACADEMY
                </div>
                <div className="text-xl font-semibold mt-1">
                  آکادمی تخصصی معماری نیله
                </div>
              </div>

              <div className="flex items-center gap-3">
                {data.valid ? (
                  <div className="inline-flex items-center gap-1.5 border border-emerald-700/40 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">
                    <ShieldCheck className="size-4 text-emerald-700" />
                    <span>
                      {fa ? "گواهینامه معتبر و تاییدشده" : "Cryptographically Verified"}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 border border-rose-700/40 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-900">
                    <XCircle className="size-4 text-rose-700" />
                    <span>{fa ? "این گواهینامه ابطال شده است" : "Certificate Revoked"}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Certificate Main Body */}
            <div className="grid md:grid-cols-[1fr_170px] gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <div className="text-xs text-neutral-500 tracking-wide">
                    گواهینامه پایان دوره و موفقیت در آزمون نهایی · CERTIFICATE OF COMPLETION
                  </div>
                  <p className="text-sm text-neutral-700">
                    بدین‌وسیله گواهی می‌شود که سرکار خانم / جناب آقای
                  </p>
                </div>

                <div>
                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950">
                    {data.studentName}
                  </h1>
                  {data.studentNameEn && (
                    <div className="text-sm font-mono uppercase tracking-wider text-neutral-500 mt-1" dir="ltr">
                      {data.studentNameEn}
                    </div>
                  )}
                </div>

                <p className="text-sm sm:text-base leading-loose text-neutral-800">
                  دوره تخصصی{" "}
                  <strong className="font-semibold text-neutral-950">
                    «{data.courseTitle}»
                  </strong>{" "}
                  {data.courseTitleEn ? (
                    <span dir="ltr" className="font-mono text-xs text-neutral-600">
                      ({data.courseTitleEn})
                    </span>
                  ) : null}{" "}
                  به مدت{" "}
                  <strong className="font-semibold tabular-nums">
                    {localeNumber("fa", data.durationHrs)} ساعت
                  </strong>{" "}
                  را با موفقیت به پایان رسانده و در آزمون ارزیابی نهایی نمره{" "}
                  <strong className="font-semibold tabular-nums text-emerald-900">
                    {localeNumber("fa", data.scorePercent)}٪
                  </strong>{" "}
                  را کسب نموده‌اند.
                </p>
              </div>

              {/* Architectural Geometric Compass Seal Artwork */}
              <div className="flex flex-col items-center justify-center border border-neutral-200 bg-[#faf8f2] p-5 text-center">
                <svg
                  viewBox="0 0 120 120"
                  className="size-28 text-neutral-900"
                  aria-hidden="true"
                >
                  <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" />
                  <polygon points="60,16 98,82 22,82" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <polygon points="60,104 98,38 22,38" fill="none" stroke="currentColor" strokeWidth="0.7" />
                  <circle cx="60" cy="60" r="7" fill="currentColor" />
                </svg>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-600">
                  NEELEH SEAL
                </div>
                <div className="text-[11px] font-medium text-neutral-800 mt-0.5">
                  مهر رسمی آکادمی
                </div>
              </div>
            </div>

            {/* Footer Metadata */}
            <footer className="grid sm:grid-cols-3 gap-6 border-t border-neutral-200 pt-6 text-xs">
              <div>
                <div className="text-neutral-500">تاریخ صدور / Issue Date</div>
                <div className="mt-1 font-medium text-neutral-950">{issueFa}</div>
                <div className="text-[11px] text-neutral-500 font-mono" dir="ltr">
                  {issueEn}
                </div>
              </div>

              <div>
                <div className="text-neutral-500">کد یکتای استعلام / Serial No.</div>
                <div className="mt-1 font-mono font-semibold text-neutral-950" dir="ltr">
                  {data.certificateCode}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-600">
                  {data.valid ? (
                    <>
                      <CheckCircle2 className="size-3 text-emerald-700" />
                      <span>{fa ? "اصالت تایید شده" : "Authentic"}</span>
                    </>
                  ) : (
                    <span>{fa ? "نامعتبر / باطل‌شده" : "Revoked"}</span>
                  )}
                </div>
              </div>

              <div className="sm:text-end">
                <div className="text-neutral-500">تاییدیه مدیریت آموزش</div>
                <div className="mt-2 font-semibold text-neutral-950">
                  آکادمی معماری نیله
                </div>
                <div className="text-[11px] text-neutral-500">
                  Academic Director & Curriculum Board
                </div>
              </div>
            </footer>
          </div>
        </div>
      </article>
    </main>
  );
}
