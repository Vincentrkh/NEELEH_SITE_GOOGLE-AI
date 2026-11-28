"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLang } from "@/components/language-provider";

export function ThemeToggle({
  variant = "academy",
  className = "",
}: {
  variant?: "academy" | "tm" | "sidebar";
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { lang } = useLang();
  const fa = lang === "fa";

  const toggle = () => {
    const isDarkNow =
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : resolvedTheme === "dark";
    setTheme(isDarkNow ? "light" : "dark");
  };

  const label = fa ? "تغییر تم روشن / تیره" : "Toggle light / dark theme";

  if (variant === "tm") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={`tm-theme-toggle ${className}`}
      >
        <Sun className="hidden dark:block size-4" strokeWidth={1.6} aria-hidden />
        <Moon className="block dark:hidden size-4" strokeWidth={1.6} aria-hidden />
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={`flex min-h-[44px] items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
      >
        <Sun className="hidden dark:block size-4 shrink-0" aria-hidden />
        <Moon className="block dark:hidden size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-start">
          <span className="dark:hidden">{fa ? "حالت تیره" : "Dark mode"}</span>
          <span className="hidden dark:inline">{fa ? "حالت روشن" : "Light mode"}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex min-h-[40px] min-w-[40px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 ${className}`}
    >
      <Sun className="hidden dark:block size-4" aria-hidden />
      <Moon className="block dark:hidden size-4" aria-hidden />
    </button>
  );
}
