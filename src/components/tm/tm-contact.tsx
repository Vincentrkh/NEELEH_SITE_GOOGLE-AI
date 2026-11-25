"use client";

import * as React from "react";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmCursor } from "@/components/tm/tm-effects";
import { TmScrollProgress } from "@/components/tm/tm-sections";
import { TmContactStudioSvg } from "@/components/tm/tm-svg-art";
import { LeadForm } from "@/components/lead-form";

/* ═══════════════════════════════════════════════════════════════════════════
   TmContact — 1:1 Match of https://www.tresmarescapital.com/en/contact/
   (Rec_0004_9ffd2644.mp4 02:26..02:32)
   ═══════════════════════════════════════════════════════════════════════════ */

export function TmContact({
  address,
  phone,
  email,
  hours,
}: {
  address: string;
  phone: string;
  email: string;
  hours: string;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const normPhone = fa
    ? toFaDigits(phone)
    : phone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  return (
    <div className="tm-root" style={{ background: "#fff", color: "#2b2b2b" }}>
      <TmCursor />
      <TmScrollProgress />
      <TmHeader />
      <main>
        <section className="tm-contact-stage" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-contact-stage__left">
            <h1 className="tm-contact-stage__title">
              {fa ? (
                <>
                  تماس با
                  <br />
                  آکادمی نیله
                </>
              ) : (
                <>
                  Contact with
                  <br />
                  Neeleh Academy
                </>
              )}
            </h1>

            <div className="tm-contact-hubs">
              <div className="tm-contact-hub">
                <h3>{fa ? "دامغان — محل برگزاری کلاس‌ها" : "Damghan — Class Venue"}</h3>
                <p>{address}</p>
                <p>{email}</p>
                <p dir="ltr" style={{ textAlign: fa ? "right" : "left" }}>
                  {normPhone}
                </p>
                {!phone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).includes("09120738211") && (
                  <p dir="ltr" style={{ textAlign: fa ? "right" : "left" }}>
                    {fa ? "۰۹۱۲۰۷۳۸۲۱۱" : "09120738211"}
                  </p>
                )}
              </div>
              <div className="tm-contact-hub">
                <h3>{fa ? "پردیس زنده آنلاین" : "Online Live Campus"}</h3>
                <p>{fa ? "کلاس‌های تعاملی زنده برای معماران" : "Live interactive mentoring workshops"}</p>
                <p>{hours}</p>
              </div>
              <div className="tm-contact-hub">
                <h3>{fa ? "پشتیبانی و همکاری دفاتر" : "Advisory Desk"}</h3>
                <p>{fa ? "هماهنگی دوره‌های اختصاصی دفاتر معماری" : "Corporate BIM & design workshops"}</p>
                <p>{email}</p>
              </div>
            </div>
          </div>

          {/* Diagonal Architectural Atelier Animated SVG (matches 02:27) */}
          <div className="tm-contact-stage__media" aria-hidden="true">
            <TmContactStudioSvg />
          </div>
        </section>

        {/* Clean Bordered Consultation Form Section */}
        <section className="tm-contact-form-section" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-contact-form-inner">
            <div className="tm-contact-form-head">
              <p className="tm-textblock__label" style={{ textAlign: "start", marginBottom: 14 }}>
                {fa ? "فرم مشاوره" : "Direct Inquiry"}
              </p>
              <h2>
                {fa
                  ? "درخواست مشاوره انتخاب مسیر یا ثبت‌نام گروهی"
                  : "Request guidance for your cohort or studio training"}
              </h2>
            </div>
            <div className="tm-contact-form-box">
              <LeadForm />
            </div>
          </div>
        </section>
      </main>
      <TmFooter />
    </div>
  );
}
