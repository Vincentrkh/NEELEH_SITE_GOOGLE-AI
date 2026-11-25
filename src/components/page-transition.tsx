"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSkin } from "@/components/skin-provider";

const TM_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function PageTransition({ children }: { children: ReactNode }) {
  const { skin } = useSkin();
  const pathname = usePathname();
  const rawReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (skin !== "tresmares") {
    return <>{children}</>;
  }

  const disableMotion = mounted && Boolean(rawReduced);

  // Animate opacity only (never transform/clip-path/will-change on the root wrapper)
  // so position: fixed descendants (.tm-header, .tm-cursor) remain pinned to the viewport.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={disableMotion ? false : { opacity: 0.94 }}
        animate={{ opacity: 1 }}
        exit={disableMotion ? { opacity: 1 } : { opacity: 0.85 }}
        transition={
          disableMotion ? { duration: 0 } : { duration: 0.38, ease: TM_EXPO }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
