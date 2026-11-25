"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { Loader2, CheckCircle2, Send } from "lucide-react";

type LeadFormProps = {
  compact?: boolean;
  tone?: "default" | "crimson";
};

/** Bilingual consultation request form — posts to /api/leads and surfaces real REQ-... tracking codes. */
export function LeadForm({ compact = false, tone = "default" }: LeadFormProps) {
  const { toast } = useToast();
  const { lang } = useLang();
  const fa = lang === "fa";

  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const isCrimson = tone === "crimson";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          topic: fd.get("topic"),
          preferredFormat: fd.get("preferredFormat"),
          message: fd.get("message"),
        }),
      });
      const data = (await res.json()) as { error?: string; requestId?: string };
      if (!res.ok) {
        toast({
          title: fa ? "ارسال نشد" : "Could not submit",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      setRequestId(data.requestId ?? "REQ-NEW");
      toast({
        title: fa ? "درخواست شما ثبت شد" : "Consultation request saved",
      });
    } catch {
      toast({
        title: fa ? "خطا" : "Network error",
        description: fa ? "ارتباط با سرور برقرار نشد" : "Could not reach server",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (requestId) {
    return (
      <div
        className={`rounded-lg border p-6 sm:p-8 text-center ${
          isCrimson
            ? "border-white/25 bg-black/25 text-white"
            : "border-emerald-300 bg-emerald-50 text-emerald-950"
        }`}
      >
        <CheckCircle2
          className={`size-10 mx-auto mb-3 ${isCrimson ? "text-amber-200" : "text-emerald-600"}`}
        />
        <h3 className="text-lg font-medium mb-1">
          {fa ? "درخواست مشاوره ثبت شد" : "Request received"}
        </h3>
        <div
          dir="ltr"
          className={`inline-block my-2 font-mono text-sm font-semibold tabular-nums ${
            isCrimson ? "text-amber-200" : "text-emerald-800"
          }`}
        >
          {requestId}
        </div>
        <p className={`text-sm leading-relaxed ${isCrimson ? "text-white/85" : "text-emerald-900/80"}`}>
          {fa
            ? "درخواست شما در صف بررسی کارشناسان قرار گرفت. به زودی با شما تماس می‌گیریم."
            : "Your consultation request is queued for an academy advisor. We will reach out shortly."}
        </p>
        <button
          type="button"
          onClick={() => setRequestId(null)}
          className={`mt-5 inline-flex min-h-[44px] items-center rounded-md border px-5 text-sm transition-colors whitespace-nowrap ${
            isCrimson
              ? "border-white/30 text-white hover:bg-white/10"
              : "border-emerald-300 text-emerald-900 hover:bg-emerald-100"
          }`}
        >
          {fa ? "ثبت درخواست جدید" : "Submit another request"}
        </button>
      </div>
    );
  }

  const labelClass = `block text-xs mb-1.5 ${
    isCrimson ? "text-white/80" : "text-muted-foreground"
  }`;
  const inputClass = isCrimson
    ? "w-full bg-white/10 border border-white/25 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white transition-colors min-h-[44px]"
    : "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-foreground transition-colors min-h-[44px]";

  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-4 rounded-lg border p-6 sm:p-8 ${
        isCrimson ? "border-white/25 bg-black/25 text-white" : "border-border bg-card text-foreground"
      }`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={compact ? "dial-lead-name" : "lead-name"} className={labelClass}>
            {fa ? "نام و نام خانوادگی *" : "Full name *"}
          </label>
          <input
            id={compact ? "dial-lead-name" : "lead-name"}
            name="name"
            required
            minLength={3}
            placeholder={fa ? "مثلاً امیر کریمی" : "e.g. Sara Moradi"}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={compact ? "dial-lead-phone" : "lead-phone"} className={labelClass}>
            {fa ? "شماره تماس *" : "Phone number *"}
          </label>
          <input
            id={compact ? "dial-lead-phone" : "lead-phone"}
            name="phone"
            required
            inputMode="tel"
            dir="ltr"
            placeholder="0912 345 6789"
            autoComplete="tel"
            className={`${inputClass} text-start`}
          />
        </div>
      </div>

      {!compact && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-topic" className={labelClass}>
              {fa ? "مسیر مورد نظر" : "Track of interest"}
            </label>
            <select id="lead-topic" name="topic" defaultValue="" className={inputClass}>
              <option value="" className="text-foreground bg-background">
                {fa ? "انتخاب مسیر یا راهنمایی مشاور" : "Help me choose a track"}
              </option>
              <option value="Foundation (AutoCAD/SketchUp)" className="text-foreground bg-background">
                {fa ? "لایه ۱ · اتوکد فاز ۲ / اسکچاپ" : "Tier 1 · AutoCAD Phase-2 / SketchUp"}
              </option>
              <option value="BIM (Revit)" className="text-foreground bg-background">
                {fa ? "لایه ۱ · مدلسازی BIM با Revit" : "Tier 1 · Revit Architecture BIM"}
              </option>
              <option value="Modeling & Render (Rhino/V-Ray/Enscape)" className="text-foreground bg-background">
                {fa ? "لایه ۲ · راینو / رندرینگ / اکسل" : "Tier 2 · Rhino / Rendering / Excel BOQ"}
              </option>
              <option value="Computational & Grasshopper" className="text-foreground bg-background">
                {fa ? "لایه ۳ · گرس‌هاپر و طراحی پارامتریک" : "Tier 3 · Grasshopper & Parametric"}
              </option>
              <option value="AI & Office Automation" className="text-foreground bg-background">
                {fa ? "لایه ۳ · اتوماسیون دفتر و هوش مصنوعی" : "Tier 3 · Automation & AI Architecture"}
              </option>
            </select>
          </div>
          <div>
            <label htmlFor="lead-format" className={labelClass}>
              {fa ? "شیوه حضور" : "Preferred format"}
            </label>
            <select id="lead-format" name="preferredFormat" defaultValue="in-person" className={inputClass}>
              <option value="in-person" className="text-foreground bg-background">
                {fa ? "حضوری — دامغان" : "In-person — Damghan"}
              </option>
              <option value="hybrid" className="text-foreground bg-background">
                {fa ? "آنلاین / هیبرید" : "Live Online / Hybrid"}
              </option>
              <option value="corporate" className="text-foreground bg-background">
                {fa ? "دوره سازمانی دفاتر معماری" : "B2B Studio Workshop"}
              </option>
            </select>
          </div>
        </div>
      )}

      {!compact && (
        <div>
          <label htmlFor="lead-email" className={labelClass}>
            {fa ? "ایمیل (اختیاری)" : "Email (optional)"}
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            dir="ltr"
            placeholder="you@example.com"
            className={`${inputClass} text-start`}
          />
        </div>
      )}

      <div>
        <label htmlFor={compact ? "dial-lead-msg" : "lead-message"} className={labelClass}>
          {fa ? "سوابق یا پرسش شما" : "Your background or question"}
        </label>
        <textarea
          id={compact ? "dial-lead-msg" : "lead-message"}
          name="message"
          rows={compact ? 2 : 3}
          placeholder={
            fa
              ? "درباره رشته، نرم‌افزارهایی که بلدید و هدف شغلی خود بنویسید…"
              : "Share your discipline, current tools, and studio goals…"
          }
          className={`${inputClass} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`w-full flex min-h-[48px] items-center justify-center gap-2 rounded-md px-6 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap ${
          isCrimson ? "bg-white text-black" : "bg-foreground text-background"
        }`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        <span>{fa ? "ارسال درخواست مشاوره" : "Request consultation"}</span>
      </button>

      <p className={`text-xs leading-relaxed ${isCrimson ? "text-white/70" : "text-muted-foreground"}`}>
        {fa
          ? "اطلاعات شما محرمانه می‌ماند و تنها برای هماهنگی جلسه مشاوره آموزشی استفاده می‌شود."
          : "Your details remain confidential and are used solely to schedule your academic advising call."}
      </p>
    </form>
  );
}
