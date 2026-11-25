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
import { SKIN_COOKIE, type Skin } from "@/lib/skin-shared";

type SkinContextValue = {
  skin: Skin;
  setSkin: (next: Skin) => void;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({
  skin: initialSkin,
  children,
}: {
  skin: Skin;
  children: ReactNode;
}) {
  const router = useRouter();
  const [skin, setSkinState] = useState<Skin>(initialSkin);

  useEffect(() => {
    setSkinState(initialSkin);
  }, [initialSkin]);

  useEffect(() => {
    document.documentElement.dataset.skin = skin;
  }, [skin]);

  const setSkin = useCallback(
    (next: Skin) => {
      setSkinState(next);
      document.documentElement.dataset.skin = next;
      const isHttps =
        typeof window !== "undefined" && window.location.protocol === "https:";
      const attrs = isHttps
        ? "path=/; max-age=31536000; SameSite=None; Secure"
        : "path=/; max-age=31536000; SameSite=Lax";
      document.cookie = `${SKIN_COOKIE}=${next}; ${attrs}`;
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => ({ skin, setSkin }), [skin, setSkin]);

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (!ctx) {
    throw new Error("useSkin must be used inside <SkinProvider>");
  }
  return ctx;
}
