"use client";

import * as React from "react";

export type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
};

type ThemeContextValue = {
  theme: string;
  resolvedTheme: string;
  setTheme: (theme: string) => void;
  themes: string[];
};

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  themes: ["light", "dark"],
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = false,
  disableTransitionOnChange = false,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(defaultTheme);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setThemeState(saved);
    } catch {
      // ignore storage access errors
    }
  }, [storageKey]);

  const resolvedTheme = React.useMemo(() => {
    if (theme === "system" && enableSystem && typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme === "system" ? defaultTheme : theme;
  }, [theme, enableSystem, defaultTheme]);

  React.useEffect(() => {
    const root = document.documentElement;
    let cleanupStyle: (() => void) | undefined;

    if (disableTransitionOnChange) {
      const style = document.createElement("style");
      style.appendChild(
        document.createTextNode(
          "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
        ),
      );
      document.head.appendChild(style);
      cleanupStyle = () => {
        void window.getComputedStyle(document.body);
        setTimeout(() => {
          style.remove();
        }, 1);
      };
    }

    if (attribute === "class") {
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    } else if (attribute.startsWith("data-")) {
      root.setAttribute(attribute, resolvedTheme);
    }
    root.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";

    cleanupStyle?.();
  }, [attribute, resolvedTheme, disableTransitionOnChange]);

  const setTheme = React.useCallback(
    (next: string) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // ignore storage access errors
      }
    },
    [storageKey],
  );

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
    }),
    [theme, resolvedTheme, setTheme, enableSystem],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
