import { getSiteSettings, localizedSetting } from "@/lib/settings";
import { getServerLang } from "@/lib/i18n";
import { localeNumber } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { LeadForm } from "@/components/lead-form";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSkin } from "@/lib/skin";
import { TmContact } from "@/components/tm/tm-contact";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const lang = await getServerLang();
  const skin = await getSkin();
  const fa = lang === "fa";
  const settings = await getSiteSettings();
  const address = localizedSetting(lang, settings, "contact.address");
  const hours = localizedSetting(lang, settings, "contact.hours");
  const phone = localeNumber(lang, settings["contact.phone"]);

  if (skin === "tresmares") {
    return (
      <TmContact
        address={address}
        phone={settings["contact.phone"]}
        email={settings["contact.email"]}
        hours={hours}
      />
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-12 sm:py-16">
        <div className="mb-10">
          <div className="text-xs text-muted-foreground mb-2">
            {fa ? "تماس و مشاوره تخصصی" : "Contact & Academic Advising"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em]">
            {fa ? "ارتباط با آکادمی نیله" : "Get in touch with Neeleh Academy"}
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
            {fa
              ? "برای مشاوره انتخاب دوره، هماهنگی ثبت‌نام گروهی دفاتر معماری یا سوالات نوبت‌های پیش‌رو با ما تماس بگیرید."
              : "Reach out for individual advising, cohort schedules, or corporate studio workshops."}
          </p>
        </div>

        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <MapPin className="size-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
              <div>
                <div className="text-xs font-medium text-muted-foreground">{fa ? "نشانی" : "Studio Address"}</div>
                <div className="text-sm mt-0.5">{address}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="size-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
              <div>
                <div className="text-xs font-medium text-muted-foreground">{fa ? "تلفن" : "Phone"}</div>
                <div dir="ltr" className="text-sm font-mono tabular-nums mt-0.5 text-start">
                  {phone}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="size-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
              <div>
                <div className="text-xs font-medium text-muted-foreground">{fa ? "ایمیل" : "Email"}</div>
                <div dir="ltr" className="text-sm font-mono mt-0.5 text-start">
                  {settings["contact.email"]}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="size-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
              <div>
                <div className="text-xs font-medium text-muted-foreground">{fa ? "ساعات کاری" : "Working hours"}</div>
                <div className="text-sm mt-0.5">{hours}</div>
              </div>
            </div>
          </div>

          <LeadForm />
        </div>
      </div>
    </PublicShell>
  );
}
