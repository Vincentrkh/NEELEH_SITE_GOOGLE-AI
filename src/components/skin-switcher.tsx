"use client";

import { usePathname } from "next/navigation";
import { useSkin } from "@/components/skin-provider";

export function SkinSwitcher() {
  const pathname = usePathname();
  const { skin, setSkin } = useSkin();

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/certificates")) return null;

  return (
    <div
      className="skin-switcher print:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-background/90 backdrop-blur px-1.5 py-1 text-[10px] uppercase tracking-[0.14em] shadow-sm"
      role="group"
      aria-label="Theme skin switcher"
    >
      <button
        type="button"
        onClick={() => setSkin("neeleh")}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          skin === "neeleh"
            ? "bg-foreground text-background font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Neeleh
      </button>
      <button
        type="button"
        onClick={() => setSkin("tresmares")}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          skin === "tresmares"
            ? "bg-[#e41613] text-white font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Tres Mares
      </button>
    </div>
  );
}
