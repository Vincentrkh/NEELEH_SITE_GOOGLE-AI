"use client";

import { usePathname } from "next/navigation";
import { useSkin } from "@/components/skin-provider";
import { useLang } from "@/components/language-provider";

export function SkinSwitcher() {
  const pathname = usePathname();
  const { skin, setSkin } = useSkin();
  const { lang } = useLang();
  const fa = lang === "fa";

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/certificates")) {
    return null;
  }

  return (
    <div
      className="skin-switcher print:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-0.5 whitespace-nowrap rounded-md border border-border bg-background/92 backdrop-blur-md p-1 text-[11px] font-medium shadow-sm"
      role="group"
      aria-label={fa ? "تغییر بخش آکادمی و دفتر" : "Switch between Neeleh Academy and Neeleh Office"}
    >
      <button
        type="button"
        onClick={() => setSkin("neeleh")}
        aria-pressed={skin === "neeleh"}
        className={`px-3 py-1.5 rounded-[4px] transition-colors ${
          skin === "neeleh"
            ? "bg-foreground text-background font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {fa ? "آکادمی نیله" : "Neeleh Academy"}
      </button>
      <button
        type="button"
        onClick={() => setSkin("tresmares")}
        aria-pressed={skin === "tresmares"}
        className={`px-3 py-1.5 rounded-[4px] transition-colors ${
          skin === "tresmares"
            ? "bg-[#e41613] text-white font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {fa ? "دفتر نیله" : "Neeleh Office"}
      </button>
    </div>
  );
}
