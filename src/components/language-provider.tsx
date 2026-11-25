"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { dict, type Dict, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "site-lang";
const COOKIE_KEY = "site-lang";

type LangContextValue = {
  lang: Lang;
  isRTL: boolean;
  t: Dict;
  setLang: (lang: Lang) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

function readCookieLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)site-lang=(en|fa)/);
  return match ? (match[1] as Lang) : null;
}

function cookieAttrs(): string {
  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return isHttps
    ? "path=/; max-age=31536000; SameSite=None; Secure"
    : "path=/; max-age=31536000; SameSite=Lax";
}

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const cookieLang = readCookieLang();
    let stored: string | null = cookieLang;
    if (!stored) {
      try {
        stored = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    if (stored === "fa" || stored === "en") {
      setLangState(stored);
      document.cookie = `${COOKIE_KEY}=${stored}; ${cookieAttrs()}`;
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      document.cookie = `${COOKIE_KEY}=${next}; ${cookieAttrs()}`;
      document.documentElement.lang = next;
      document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      isRTL: lang === "fa",
      t: dict[lang],
      setLang,
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used inside <LanguageProvider>");
  }
  return ctx;
}
