"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// کتابخانه افکت‌های موشن آکادمی نیله
// ═══════════════════════════════════════════════════════════════════════════

export function useCountUp(target: number, duration = 1500, start = 0): number {
  const [value, setValue] = useState(start);
  const rafRef = useRef<number>();
  useEffect(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(start + (target - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, start]);
  return value;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {}
): { ref: React.RefObject<T | null>; visible: boolean } {
  const { threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);
  return { ref, visible };
}

export const revealStyles = {
  hidden: {
    opacity: 0,
    transform: "translateY(30px) scale(0.95)",
    filter: "blur(8px)",
    transition: "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1), filter 0.8s cubic-bezier(0.22,1,0.36,1)",
  },
  visible: (delay = 0) => ({
    opacity: 1,
    transform: "translateY(0) scale(1)",
    filter: "blur(0px)",
    transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms, filter 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  }),
};

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });
  const style = visible ? revealStyles.visible(delay) : revealStyles.hidden;
  return (
    <div ref={ref} className={className} style={style as React.CSSProperties}>
      {children}
    </div>
  );
}

export function useMagneticHover<T extends HTMLElement = HTMLButtonElement>(
  strength = 0.3
): { ref: React.RefObject<T | null>; handleMove: (e: React.MouseEvent) => void; handleLeave: () => void } {
  const ref = useRef<T>(null);
  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    el.style.transition = "transform 0.15s ease-out";
  }, [strength]);
  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
    el.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
  }, []);
  return { ref, handleMove, handleLeave };
}
