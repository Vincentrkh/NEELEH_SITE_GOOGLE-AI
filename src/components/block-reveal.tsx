"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Scroll-linked block entrance animation using GPU-composited properties only
 * (opacity + translateY), respecting prefers-reduced-motion.
 */
export function BlockReveal({
  children,
  className,
  delay = 0,
  distance = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}) {
  const reduced = useSafeReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Mount-time entrance animation for above-the-fold blocks so blocks animate smoothly on load.
 */
export function HeroBlockEntrance({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useSafeReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.72, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
