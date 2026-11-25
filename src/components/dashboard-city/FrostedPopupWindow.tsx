"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";
import {
  Box,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import type { CityNode } from "./city-data";
import { GROUP_META } from "./city-data";
import { CityNodeIcon } from "./city-icons";

export type PopupRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FrostedPopupWindowProps = {
  node: CityNode;
  lang: "fa" | "en";
  isRTL: boolean;
  isSoftwareGl: boolean;
  maximized: boolean;
  isoTilted: boolean;
  rect: PopupRect;
  onChangeRect: (next: PopupRect) => void;
  onToggleIso: (iso: boolean) => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

export function FrostedPopupWindow({
  node,
  lang,
  isRTL,
  isSoftwareGl,
  maximized,
  isoTilted,
  rect,
  onChangeRect,
  onToggleIso,
  onMinimize,
  onToggleMaximize,
  onClose,
  children,
}: FrostedPopupWindowProps) {
  const shouldReduceMotion = useSafeReducedMotion();
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    origRect: PopupRect;
  } | null>(null);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;

      if (dragging) {
        const nextX = Math.max(
          12,
          Math.min(vw - Math.min(ds.origRect.width, vw - 24), ds.origRect.x + dx)
        );
        const nextY = Math.max(
          68,
          Math.min(vh - 110, ds.origRect.y + dy)
        );
        onChangeRect({
          ...ds.origRect,
          x: nextX,
          y: nextY,
        });
      } else if (resizing) {
        const minW = Math.min(460, vw - 24);
        const minH = 320;
        const maxW = vw - ds.origRect.x - 16;
        const maxH = vh - ds.origRect.y - 72;
        const signedDx = isRTL ? -dx : dx;
        const nextW = Math.max(minW, Math.min(maxW, ds.origRect.width + signedDx));
        const nextH = Math.max(minH, Math.min(maxH, ds.origRect.height + dy));
        onChangeRect({
          ...ds.origRect,
          x: isRTL
            ? Math.max(12, ds.origRect.x + (ds.origRect.width - nextW))
            : ds.origRect.x,
          width: nextW,
          height: nextH,
        });
      }
    };

    const handleUp = () => {
      setDragging(false);
      setResizing(false);
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, resizing, isRTL, onChangeRect]);

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (maximized) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select")) return;
    e.preventDefault();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origRect: rect,
    };
    setDragging(true);
  }

  function startResize(e: React.PointerEvent<HTMLButtonElement>) {
    if (maximized) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origRect: rect,
    };
    setResizing(true);
  }

  const windowStyle: React.CSSProperties = maximized
    ? {
        position: "fixed",
        top: 76,
        left: 16,
        right: 16,
        bottom: 72,
      }
    : {
        position: "fixed",
        top: rect.y,
        left: rect.x,
        width: rect.width,
        height: rect.height,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100svh - 140px)",
      };

  return (
    <motion.section
      role="dialog"
      aria-label={lang === "fa" ? node.label : node.labelEn}
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.72, y: 24 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.84, y: 16 }
      }
      transition={{
        duration: shouldReduceMotion ? 0.14 : 0.52,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ ...windowStyle, transformOrigin: "center center" }}
      className={`city-frosted-window z-30 flex flex-col overflow-hidden rounded-[24px] ${
        isSoftwareGl ? "city-frosted-fallback" : "city-frosted-blur"
      } ${dragging || resizing ? "select-none" : ""}`}
    >
      {/* نوار عنوان قابل درگ (Drag Handle) */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={onToggleMaximize}
        className={`city-window-titlebar flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-400/20 ${
          maximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-800/90 text-white shadow-sm">
            <CityNodeIcon iconKey={node.iconKey} className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {lang === "fa" ? node.label : node.labelEn}
              </h2>
              <span className="hidden sm:inline-block rounded-full bg-slate-900/8 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {GROUP_META[node.group][lang]}
              </span>
            </div>
            <div
              dir="ltr"
              className="text-[10px] font-medium text-slate-500 truncate"
            >
              {lang === "fa" ? node.districtFa : node.districtEn} · [{node.x},{" "}
              {node.z}]
            </div>
          </div>
        </div>

        {/* ابزارهای سوییچ ایزومتریک و دکمه‌های کنترل پنجره */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center rounded-full bg-white/55 p-0.5 border border-white/80">
            <button
              type="button"
              onClick={() => onToggleIso(true)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                isoTilted
                  ? "city-blue-pill"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Box className="size-3" />
              <span>{lang === "fa" ? "ایزومتریک" : "Isometric"}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleIso(false)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                !isoTilted
                  ? "city-blue-pill"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="size-3" />
              <span>{lang === "fa" ? "صاف" : "Flat"}</span>
            </button>
          </div>

          {/* دکمه Minimize */}
          <button
            type="button"
            onClick={onMinimize}
            title={lang === "fa" ? "کوچک کردن (Minimize)" : "Minimize"}
            aria-label={lang === "fa" ? "کوچک کردن پنجره" : "Minimize window"}
            className="city-win-ctrl grid size-7 place-items-center rounded-full text-slate-700 hover:bg-white/80 transition-colors"
          >
            <Minus className="size-3.5" />
          </button>

          {/* دکمه Maximize / Restore */}
          <button
            type="button"
            onClick={onToggleMaximize}
            title={
              maximized
                ? lang === "fa"
                  ? "حالت پنجره‌ای"
                  : "Restore size"
                : lang === "fa"
                ? "بزرگ‌نمایی"
                : "Maximize"
            }
            aria-label={
              maximized
                ? lang === "fa"
                  ? "بازگرداندن اندازه پنجره"
                  : "Restore window"
                : lang === "fa"
                ? "بزرگ‌نمایی پنجره"
                : "Maximize window"
            }
            className="city-win-ctrl grid size-7 place-items-center rounded-full text-slate-700 hover:bg-white/80 transition-colors"
          >
            {maximized ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </button>

          {/* دکمه Close */}
          <button
            type="button"
            onClick={onClose}
            title={lang === "fa" ? "بستن و بازگشت به نقشه" : "Close window"}
            aria-label={lang === "fa" ? "بستن پنجره" : "Close window"}
            className="city-win-ctrl grid size-7 place-items-center rounded-full text-slate-700 hover:bg-rose-500/15 hover:text-rose-600 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* بدنه اسکرول‌پذیر محتوای ساختمان داخل پنجره شیشه‌ای مات */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div
          className={`city-interior-stage ${
            isoTilted ? "city-iso-tilted" : ""
          }`}
        >
          {children}
        </div>
      </main>

      {/* دستگیره تغییر اندازه در گوشه پایین پنجره */}
      {!maximized && (
        <button
          type="button"
          onPointerDown={startResize}
          aria-label={lang === "fa" ? "تغییر اندازه پنجره" : "Resize window"}
          title={lang === "fa" ? "تغییر اندازه" : "Resize"}
          className={`hidden sm:flex absolute bottom-1.5 ${
            isRTL ? "left-1.5 cursor-nesw-resize" : "right-1.5 cursor-nwse-resize"
          } size-6 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-colors`}
        >
          <GripHorizontal className="size-3.5" />
        </button>
      )}
    </motion.section>
  );
}
