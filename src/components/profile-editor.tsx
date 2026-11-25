"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  hasAtLeastOneSocial,
} from "@/lib/socials";
import {
  Loader2,
  Save,
  User,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  FileText,
  MessageSquareShare,
} from "lucide-react";

type Profile = {
  name: string;
  phone: string;
  email: string | null;
  field: string | null;
  education: string | null;
  bio: string | null;
  telegram: string | null;
  whatsapp: string | null;
  eitaa: string | null;
  bale: string | null;
  instagram: string | null;
  linkedin: string | null;
};

export function ProfileEditor({ initial }: { initial: Profile }) {
  const router = useRouter();
  const { toast } = useToast();
  const { lang } = useLang();
  const fa = lang === "fa";
  const [data, setData] = useState<Profile>(initial);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const hasSocial = hasAtLeastOneSocial(data);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasSocial) {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa
          ? "حداقل یک شبکه اجتماعی یا پیام‌رسان باید ثبت باشد."
          : "At least one social network or messenger handle is required.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/panel/profile/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await res.json()) as { error?: string; user?: Profile };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: result.error, variant: "destructive" });
        return;
      }
      if (result.user) {
        setData(result.user);
      }
      toast({ title: fa ? "پروفایل به‌روزرسانی شد" : "Profile updated" });
      router.refresh();
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-5">
      <div>
        <div className="text-[11px] font-medium text-muted-foreground mb-2">
          {fa ? "پروفایل من" : "My Profile"}
        </div>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-foreground text-background text-base font-bold uppercase shrink-0">
            {data.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{data.name}</div>
            <div dir="ltr" className="text-xs text-muted-foreground text-start truncate tabular-nums">
              {data.phone}
            </div>
          </div>
        </div>
      </div>

      <FieldRow icon={User} label={fa ? "نام و نام خانوادگی" : "Full name"}>
        <input
          type="text"
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          required
          minLength={3}
          className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[42px]"
        />
      </FieldRow>

      <FieldRow icon={Phone} label={fa ? "شماره موبایل" : "Mobile"}>
        <input
          type="tel"
          value={data.phone}
          disabled
          dir="ltr"
          className="w-full bg-transparent border-b border-border py-2 text-sm outline-none text-start min-h-[42px] disabled:opacity-60 tabular-nums"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          {fa ? "شماره موبایل قابل تغییر نیست" : "Mobile phone cannot be changed"}
        </p>
      </FieldRow>

      <FieldRow icon={Mail} label={fa ? "ایمیل" : "Email"}>
        <input
          type="email"
          value={data.email ?? ""}
          onChange={(e) => update("email", e.target.value)}
          dir="ltr"
          placeholder="you@example.com"
          className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors text-start min-h-[42px]"
        />
      </FieldRow>

      <div className="rounded-md border border-border bg-secondary/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MessageSquareShare className="size-3.5 text-muted-foreground" />
            <span>{fa ? "شبکه‌های اجتماعی *" : "Social Handles *"}</span>
          </div>
          <span className={`text-[11px] ${hasSocial ? "text-emerald-700" : "text-amber-700"}`}>
            {fa ? "حداقل ۱ مورد الزامی" : "Min 1 required"}
          </span>
        </div>
        <div className="grid gap-2.5">
          {SOCIAL_PLATFORMS.map((platform) => {
            const meta = SOCIAL_PLATFORM_META[platform];
            return (
              <div key={platform} className="grid grid-cols-[78px_1fr] items-center gap-2">
                <label
                  htmlFor={`profile-social-${platform}`}
                  className="text-xs text-muted-foreground truncate"
                >
                  {fa ? meta.labelFa : meta.labelEn}
                </label>
                <input
                  id={`profile-social-${platform}`}
                  type="text"
                  dir="ltr"
                  value={data[platform] ?? ""}
                  onChange={(e) => update(platform, e.target.value)}
                  placeholder={fa ? meta.placeholderFa : meta.placeholderEn}
                  className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-foreground transition-colors text-start min-h-[36px]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <FieldRow icon={GraduationCap} label={fa ? "رشته تحصیلی" : "Academic Field"}>
        <input
          type="text"
          value={data.field ?? ""}
          onChange={(e) => update("field", e.target.value)}
          placeholder={fa ? "مثلاً معماری" : "e.g. Architecture"}
          className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[42px]"
        />
      </FieldRow>

      <FieldRow icon={BookOpen} label={fa ? "سوابق تحصیلی" : "Education"}>
        <input
          type="text"
          value={data.education ?? ""}
          onChange={(e) => update("education", e.target.value)}
          placeholder={fa ? "مثلاً کارشناسی معماری" : "e.g. B.Arch"}
          className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[42px]"
        />
      </FieldRow>

      <FieldRow icon={FileText} label={fa ? "معرفی کوتاه" : "Short Bio"}>
        <textarea
          value={data.bio ?? ""}
          onChange={(e) => update("bio", e.target.value)}
          rows={3}
          placeholder={fa ? "چند خط درباره خودتان..." : "A few lines about yourself…"}
          className="w-full bg-transparent border border-border rounded-md p-3 text-sm outline-none focus:border-foreground transition-colors resize-y min-h-[42px]"
        />
      </FieldRow>

      <button
        type="submit"
        disabled={busy}
        className="w-full flex min-h-[44px] items-center justify-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        <span>{fa ? "ذخیره پروفایل" : "Save Profile"}</span>
      </button>
    </form>
  );
}

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        <Icon className="size-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}
