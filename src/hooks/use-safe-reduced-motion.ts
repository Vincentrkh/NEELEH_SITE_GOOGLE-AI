"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * SSR/CSR-safe wrapper around Framer Motion's `useReducedMotion`.
 * Returns `false` on SSR and the initial client hydration pass so SVG/DOM
 * attributes always match identically, then switches to the live media query.
 */
export function useSafeReducedMotion(): boolean {
  const raw = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && Boolean(raw);
}
