"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Columns2,
  Crosshair,
  Eye,
  EyeOff,
  GripHorizontal,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  Palette,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useLang } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import {
  buildLiveOverridesCss,
  LiveOverrideRule,
  normalizeOverridePath,
} from "@/lib/live-overrides";

/* ═══════════════════════════════════════════════════════════════════════════
   AdminLiveInspector
   ───────────────────────────────────────────────────────────────────────────
   • LiveOverridesRuntime: اعمال دائمی قوانین استایل و متن در تمام صفحات سایت
   • Admin Scene Inspector: ابزار تعاملی مخصوص مدیر برای انتخاب هر آبجکت روی صحنه،
     تغییر متن و استایل، تنظیم زنده کره Hero، و اجرای دستورات هوش مصنوعی (Gemini)
     در یک پنل همراه با قابلیت جابه‌جایی، تغییر اندازه، داک، جمع‌کردن و بستن.
   ═══════════════════════════════════════════════════════════════════════════ */

type TabId = "ai" | "visual" | "rules";

type SelectedElementInfo = {
  selector: string;
  label: string;
  tagName: string;
  classes: string;
  text: string;
  canEditText: boolean;
  isHeroScene: boolean;
  computed: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    textAlign: string;
    padding: string;
    margin: string;
    borderRadius: string;
    opacity: string;
    border: string;
    boxShadow: string;
    display: string;
    position: string;
    top: string;
    right: string;
    bottom: string;
    left: string;
    zIndex: string;
    width: string;
    height: string;
    minHeight: string;
    maxWidth: string;
    boxSizing: string;
  };
};

type RectBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
};

type ResizeHandleDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type GlobeSettings = Record<string, string | number | boolean>;

type DraftState = {
  text: string;
  textDirty: boolean;
  styles: Record<string, string>;
  customCss: string;
  hidden: boolean;
  scope: "page" | "global";
};

function parsePxValue(val: string | undefined): number | null {
  if (!val) return null;
  const s = val.trim();
  if (!s || s === "auto" || s === "none") return null;
  const m = /^-?\d+(?:\.\d+)?(?=px$|$)/i.exec(s);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function rgbToHex(input: string): string {
  const s = input.trim();
  if (s.startsWith("#") && (s.length === 7 || s.length === 4)) return s;
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (!m) return "#2b2b2b";
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

function isTransparentColor(input: string): boolean {
  const s = input.trim().toLowerCase();
  return !s || s === "transparent" || s === "rgba(0, 0, 0, 0)";
}

function escapeIdent(ident: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(ident);
  }
  return ident.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function generateStableSelector(el: HTMLElement): string {
  if (el.id && !/^:r/.test(el.id)) {
    const idSel = `#${escapeIdent(el.id)}`;
    try {
      if (document.querySelectorAll(idSel).length === 1) return idSel;
    } catch {
      // fall through
    }
  }

  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  let depth = 0;

  while (cur && cur !== document.body && cur !== document.documentElement && depth < 6) {
    if (cur.id && !/^:r/.test(cur.id)) {
      parts.unshift(`#${escapeIdent(cur.id)}`);
      break;
    }

    const tag = cur.tagName.toLowerCase();
    let part = tag;

    const stableClasses = Array.from(cur.classList).filter(
      (c) =>
        c.length >= 2 &&
        c.length <= 42 &&
        !/^(hover|focus|active|animate-|transition|tm-is-|is-|js-)/.test(c) &&
        !/[\[\]:!/]/.test(c),
    );
    if (stableClasses.length > 0) {
      part += `.${stableClasses.slice(0, 2).map(escapeIdent).join(".")}`;
    }

    const parent: HTMLElement | null = cur.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (ch) => ch.tagName === cur!.tagName,
      );
      if (sameTagSiblings.length > 1) {
        const idx = sameTagSiblings.indexOf(cur) + 1;
        part += `:nth-of-type(${idx})`;
      }
    }

    parts.unshift(part);

    const candidate = parts.join(" > ");
    try {
      if (document.querySelectorAll(candidate).length === 1) {
        return candidate;
      }
    } catch {
      // continue building upward
    }

    cur = parent;
    depth += 1;
  }

  return parts.join(" > ") || el.tagName.toLowerCase();
}

function inspectDomElement(el: HTMLElement): SelectedElementInfo {
  const cs = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const tag = el.tagName.toLowerCase();
  const hasComplexChildren = Boolean(
    el.querySelector("svg, canvas, video, img, input, textarea, select, iframe") ||
      el.children.length > 3,
  );
  const canEditText =
    !hasComplexChildren &&
    !["canvas", "svg", "img", "video", "section", "main", "header", "footer"].includes(tag);

  const selector = generateStableSelector(el);
  const firstClass = Array.from(el.classList).find((c) => !/[\[\]:!]/.test(c));
  const snippet = (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 32);
  const label = snippet
    ? `${tag}${firstClass ? `.${firstClass}` : ""} — "${snippet}"`
    : `${tag}${el.id ? `#${el.id}` : firstClass ? `.${firstClass}` : ""}`;

  const isHeroScene = Boolean(
    el.closest(".tm-hero") ||
      el.closest(".tm-hero-scene") ||
      (tag === "canvas" && el.closest("section")?.classList.contains("tm-hero")),
  );

  return {
    selector,
    label,
    tagName: tag,
    classes: Array.from(el.classList).join(" "),
    text: (el.textContent ?? "").trim(),
    canEditText,
    isHeroScene,
    computed: {
      color: rgbToHex(cs.color),
      backgroundColor: isTransparentColor(cs.backgroundColor) ? "" : rgbToHex(cs.backgroundColor),
      fontSize: cs.fontSize || "16px",
      fontWeight: cs.fontWeight || "400",
      lineHeight: cs.lineHeight || "normal",
      letterSpacing: cs.letterSpacing || "normal",
      textAlign: cs.textAlign || "start",
      padding: cs.padding || "0px",
      margin: cs.margin || "0px",
      borderRadius: cs.borderRadius || "0px",
      opacity: cs.opacity || "1",
      border: cs.border || "",
      boxShadow: cs.boxShadow === "none" ? "" : cs.boxShadow,
      display: cs.display || "block",
      position: cs.position || "static",
      top: cs.top || "auto",
      right: cs.right || "auto",
      bottom: cs.bottom || "auto",
      left: cs.left || "auto",
      zIndex: cs.zIndex || "auto",
      width: `${Math.round(rect.width)}px`,
      height: `${Math.round(rect.height)}px`,
      minHeight: cs.minHeight || "0px",
      maxWidth: cs.maxWidth || "none",
      boxSizing: cs.boxSizing || "border-box",
    },
  };
}

function applyTextOverridesForPath(
  rules: LiveOverrideRule[],
  normPath: string,
  previewRule?: LiveOverrideRule | null,
) {
  if (typeof document === "undefined") return;
  const active = rules.filter((r) => r.path === "*" || r.path === normPath);
  if (previewRule && (previewRule.path === "*" || previewRule.path === normPath)) {
    const idx = active.findIndex((r) => r.selector === previewRule.selector);
    if (idx >= 0) active[idx] = previewRule;
    else active.push(previewRule);
  }

  // Track which elements currently have a text override
  const overriddenEls = new Set<HTMLElement>();

  for (const r of active) {
    if (r.text === undefined) continue;
    try {
      const nodes = document.querySelectorAll<HTMLElement>(r.selector);
      nodes.forEach((node) => {
        if (node.closest("[data-live-inspector-ui]")) return;
        overriddenEls.add(node);
        if (!node.hasAttribute("data-live-orig-text")) {
          node.setAttribute("data-live-orig-text", node.textContent ?? "");
        }
        if (node.textContent !== r.text) {
          node.textContent = r.text ?? "";
        }
      });
    } catch {
      // ignore invalid selector
    }
  }

  // Restore any elements whose text override was reverted/deleted
  document.querySelectorAll<HTMLElement>("[data-live-orig-text]").forEach((node) => {
    if (!overriddenEls.has(node)) {
      const orig = node.getAttribute("data-live-orig-text");
      if (orig !== null && node.textContent !== orig) {
        node.textContent = orig;
      }
      node.removeAttribute("data-live-orig-text");
    }
  });
}

export function AdminLiveInspector({
  initialIsAdmin = false,
  initialRules = [],
}: {
  initialIsAdmin?: boolean;
  initialRules?: LiveOverrideRule[];
}) {
  const pathname = usePathname() || "/";
  const normPath = normalizeOverridePath(pathname);
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [mounted, setMounted] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(initialIsAdmin);
  const [rules, setRules] = React.useState<LiveOverrideRule[]>(initialRules);

  // Inspector UX State
  const [pickMode, setPickMode] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const [dockMode, setDockMode] = React.useState<"float" | "dock">("float");
  const [activeTab, setActiveTab] = React.useState<TabId>("ai");
  const [directTransformOn, setDirectTransformOn] = React.useState(true);
  const [nudgeStep, setNudgeStep] = React.useState<1 | 8 | 24>(8);

  // Window position & size (floating mode)
  const [pos, setPos] = React.useState({ x: 24, y: 88 });
  const [size, setSize] = React.useState({ w: 430, h: 610 });

  // Selected element & draft
  const selectedElRef = React.useRef<HTMLElement | null>(null);
  const [selected, setSelected] = React.useState<SelectedElementInfo | null>(null);
  const [hoverRect, setHoverRect] = React.useState<RectBox | null>(null);
  const [selectedRect, setSelectedRect] = React.useState<RectBox | null>(null);

  const [draft, setDraft] = React.useState<DraftState>({
    text: "",
    textDirty: false,
    styles: {},
    customCss: "",
    hidden: false,
    scope: "page",
  });

  // AI prompt state
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);
  const [aiModelBadge, setAiModelBadge] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Hero Globe integration
  const [globeSettings, setGlobeSettings] = React.useState<GlobeSettings | null>(null);
  const [globePatchDraft, setGlobePatchDraft] = React.useState<GlobeSettings | null>(null);

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/login");

  // Sync mount + initial position
  React.useEffect(() => {
    setMounted(true);
    const vw = window.innerWidth;
    setPos({
      x: Math.max(16, vw - 454),
      y: 88,
    });
  }, []);

  // Re-verify admin status on mount, route transitions, auth events & focus
  const checkAdminAuth = React.useCallback(() => {
    let cancelled = false;
    fetch("/api/auth/me/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const u = data?.user as { roles?: string[]; permissions?: string[] } | null;
        const allowed = Boolean(
          u &&
            (u.roles?.includes("ADMIN") ||
              u.permissions?.includes("theme.manage")),
        );
        setIsAdmin(allowed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const cancel = checkAdminAuth();
    const onAuthChanged = () => {
      checkAdminAuth();
    };
    const onFocus = () => {
      checkAdminAuth();
    };
    window.addEventListener("neeleh-auth-changed", onAuthChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      cancel();
      window.removeEventListener("neeleh-auth-changed", onAuthChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname, checkAdminAuth]);

  // Auto-open Inspector + Pick Mode when arriving via ?inspector=1 from Dashboard
  React.useEffect(() => {
    if (!mounted || !isAdmin || isDashboard) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("inspector") === "1") {
        setPanelOpen(true);
        setMinimized(false);
        setPickMode(true);
        url.searchParams.delete("inspector");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    } catch {
      // ignore URL parse error
    }
  }, [mounted, isAdmin, isDashboard, pathname]);

  // Keep html[data-live-path] synced + fetch persisted rules
  React.useEffect(() => {
    document.documentElement.setAttribute("data-live-path", normPath);
  }, [normPath]);

  const fetchRules = React.useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/live-overrides/", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { rules?: LiveOverrideRule[] };
      if (Array.isArray(data.rules)) setRules(data.rules);
    } catch {
      // silent
    }
  }, []);

  React.useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  // Build preview rule for currently edited element
  const previewRule = React.useMemo<LiveOverrideRule | null>(() => {
    if (!selected) return null;
    const hasStyles = Object.keys(draft.styles).length > 0;
    const hasCustom = draft.customCss.trim().length > 0;
    if (!draft.textDirty && !hasStyles && !hasCustom && !draft.hidden) return null;
    return {
      id: `${draft.scope === "global" ? "*" : normPath}::${selected.selector}`,
      path: draft.scope === "global" ? "*" : normPath,
      selector: selected.selector,
      label: selected.label,
      ...(draft.textDirty ? { text: draft.text } : {}),
      ...(hasStyles ? { styles: draft.styles } : {}),
      ...(hasCustom ? { customCss: draft.customCss } : {}),
      ...(draft.hidden ? { hidden: true } : {}),
      updatedAt: new Date().toISOString(),
    };
  }, [selected, draft, normPath]);

  // Keep <style id="neeleh-live-overrides-css"> + preview CSS + text overrides synchronized
  React.useEffect(() => {
    if (typeof document === "undefined" || isDashboard) return;

    // 1. Persisted CSS
    let styleEl = document.getElementById("neeleh-live-overrides-css") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "neeleh-live-overrides-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildLiveOverridesCss(rules);

    // 2. Live Preview CSS
    let previewEl = document.getElementById("neeleh-live-preview-css") as HTMLStyleElement | null;
    if (previewRule) {
      if (!previewEl) {
        previewEl = document.createElement("style");
        previewEl.id = "neeleh-live-preview-css";
        document.head.appendChild(previewEl);
      }
      previewEl.textContent = buildLiveOverridesCss([previewRule]);
    } else if (previewEl) {
      previewEl.textContent = "";
    }

    // 3. Text overrides (applied now + after brief hydration/animation frames)
    applyTextOverridesForPath(rules, normPath, previewRule);
    const t1 = window.setTimeout(() => applyTextOverridesForPath(rules, normPath, previewRule), 350);
    return () => window.clearTimeout(t1);
  }, [rules, normPath, previewRule, isDashboard]);

  // Select a DOM element cleanly
  const selectElement = React.useCallback(
    (el: HTMLElement) => {
      selectedElRef.current = el;
      const info = inspectDomElement(el);
      setSelected(info);
      setAiNote(null);
      setAiModelBadge(null);

      // Hydrate draft from any existing rule matching this selector & path
      const existing =
        rules.find((r) => r.selector === info.selector && r.path === normPath) ??
        rules.find((r) => r.selector === info.selector && r.path === "*");

      setDraft({
        text: existing?.text ?? info.text,
        textDirty: existing?.text !== undefined,
        styles: existing?.styles ? { ...existing.styles } : {},
        customCss: existing?.customCss ?? "",
        hidden: existing?.hidden === true,
        scope: existing?.path === "*" ? "global" : "page",
      });

      if (info.isHeroScene) {
        fetch("/api/tm/globe-config/", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.settings) {
              setGlobeSettings(d.settings);
              setGlobePatchDraft(null);
            }
          })
          .catch(() => {});
      } else {
        setGlobePatchDraft(null);
      }

      const rect = el.getBoundingClientRect();
      setSelectedRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        label: info.tagName,
      });

      setPanelOpen(true);
      setMinimized(false);
    },
    [rules, normPath],
  );

  // Sync bounding rect of selected element on scroll / resize
  React.useEffect(() => {
    if (!selected || !panelOpen) {
      setSelectedRect(null);
      return;
    }
    const syncRect = () => {
      const el = selectedElRef.current;
      if (!el || !document.contains(el)) {
        setSelectedRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setSelectedRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        label: selected.tagName,
      });
    };
    syncRect();
    window.addEventListener("scroll", syncRect, { passive: true });
    window.addEventListener("resize", syncRect);
    const id = window.setInterval(syncRect, 450);
    return () => {
      window.removeEventListener("scroll", syncRect);
      window.removeEventListener("resize", syncRect);
      window.clearInterval(id);
    };
  }, [selected, panelOpen, draft]);

  // Interactive Pick Mode listeners
  React.useEffect(() => {
    if (!isAdmin || isDashboard || !pickMode) {
      setHoverRect(null);
      document.documentElement.classList.remove("neeleh-pick-mode");
      document.getElementById("neeleh-pick-mode-css")?.remove();
      return;
    }

    document.documentElement.classList.add("neeleh-pick-mode");
    let pickStyle = document.getElementById("neeleh-pick-mode-css") as HTMLStyleElement | null;
    if (!pickStyle) {
      pickStyle = document.createElement("style");
      pickStyle.id = "neeleh-pick-mode-css";
      pickStyle.textContent = `
        html.neeleh-pick-mode h1,
        html.neeleh-pick-mode h2,
        html.neeleh-pick-mode h3,
        html.neeleh-pick-mode h4,
        html.neeleh-pick-mode p,
        html.neeleh-pick-mode span,
        html.neeleh-pick-mode a,
        html.neeleh-pick-mode button,
        html.neeleh-pick-mode img,
        html.neeleh-pick-mode svg,
        html.neeleh-pick-mode .tm-hero__title,
        html.neeleh-pick-mode .tm-hero__aside,
        html.neeleh-pick-mode .tm-hero__scroll {
          pointer-events: auto !important;
          cursor: crosshair !important;
        }
      `;
      document.head.appendChild(pickStyle);
    }

    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-live-inspector-ui]")) {
        setHoverRect(null);
        return;
      }
      const r = target.getBoundingClientRect();
      const cls = target.classList[0] ? `.${target.classList[0]}` : "";
      setHoverRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        label: `${target.tagName.toLowerCase()}${cls} (${Math.round(r.width)}×${Math.round(r.height)})`,
      });
    };

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-live-inspector-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(target);
      setPickMode(false);
      setHoverRect(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickMode(false);
        setHoverRect(null);
      }
    };

    document.body.style.cursor = "crosshair";
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("click", onClickCapture, { capture: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.cursor = "";
      document.documentElement.classList.remove("neeleh-pick-mode");
      document.getElementById("neeleh-pick-mode-css")?.remove();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("click", onClickCapture, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAdmin, isDashboard, pickMode, selectElement]);

  // Drag window handler
  const startDrag = (e: React.PointerEvent) => {
    if (dockMode === "dock") return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = pos.x;
    const origY = pos.y;

    const onMove = (ev: PointerEvent) => {
      const maxX = Math.max(8, window.innerWidth - size.w - 8);
      const maxY = Math.max(8, window.innerHeight - 56);
      setPos({
        x: Math.min(maxX, Math.max(8, origX + (ev.clientX - startX))),
        y: Math.min(maxY, Math.max(8, origY + (ev.clientY - startY))),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Resize window handler (supports corner / horizontal / vertical)
  const startResize = (
    e: React.PointerEvent,
    axis: "right" | "left" | "bottom" | "corner-right" | "corner-left",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = size.w;
    const origH = size.h;
    const origX = pos.x;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const maxW = Math.min(760, window.innerWidth - 24);
      const maxH = window.innerHeight - 24;

      if (axis === "right" || axis === "corner-right") {
        setSize((s) => ({
          ...s,
          w: Math.max(320, Math.min(maxW, origW + dx)),
        }));
      }
      if (axis === "left" || axis === "corner-left") {
        const nextW = Math.max(320, Math.min(maxW, origW - dx));
        const delta = nextW - origW;
        setSize((s) => ({ ...s, w: nextW }));
        if (dockMode === "float") {
          setPos((p) => ({ ...p, x: Math.max(8, origX - delta) }));
        }
      }
      if (axis === "bottom" || axis === "corner-right" || axis === "corner-left") {
        setSize((s) => ({
          ...s,
          h: Math.max(280, Math.min(maxH, origH + dy)),
        }));
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Navigate DOM hierarchy from selected element
  const stepParent = () => {
    const parent = selectedElRef.current?.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      selectElement(parent);
    }
  };
  const stepChild = () => {
    const child = selectedElRef.current?.firstElementChild as HTMLElement | null;
    if (child && !child.closest("[data-live-inspector-ui]")) {
      selectElement(child);
    }
  };

  // Update a CSS property in draft
  const setStyleProp = (prop: string, value: string) => {
    setDraft((d) => {
      const next = { ...d.styles };
      if (!value.trim()) delete next[prop];
      else next[prop] = value;
      return { ...d, styles: next };
    });
  };

  // Nudge selected element position by (dx, dy) px
  const nudgeSelectedElement = (dx: number, dy: number) => {
    const el = selectedElRef.current;
    if (!el || !selected) return;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const curPos = (draft.styles["position"] || cs.position || "static").toLowerCase();
    const nextPos = curPos === "static" ? "relative" : curPos;
    const isAbsOrFixed = nextPos === "absolute" || nextPos === "fixed";

    const origLeft =
      curPos === "static"
        ? 0
        : (parsePxValue(draft.styles["left"]) ?? parsePxValue(cs.left) ?? 0);
    const origTop =
      curPos === "static"
        ? 0
        : (parsePxValue(draft.styles["top"]) ?? parsePxValue(cs.top) ?? 0);

    setDraft((d) => {
      const next = { ...d.styles };
      next["position"] = nextPos;
      next["left"] = `${Math.round(origLeft + dx)}px`;
      next["top"] = `${Math.round(origTop + dy)}px`;
      if (isAbsOrFixed) {
        next["right"] = "auto";
        next["bottom"] = "auto";
        if (!next["width"] && rect.width > 0) {
          next["width"] = `${Math.round(rect.width)}px`;
        }
      }
      return { ...d, styles: next };
    });
  };

  // Reset layout position & dimension overrides only
  const resetElementPositionAndSize = () => {
    setDraft((d) => {
      const next = { ...d.styles };
      for (const k of [
        "position",
        "top",
        "right",
        "bottom",
        "left",
        "z-index",
        "width",
        "height",
        "min-width",
        "max-width",
        "min-height",
        "box-sizing",
        "display",
      ]) {
        delete next[k];
      }
      return { ...d, styles: next };
    });
  };

  // Direct on-canvas Drag-to-Move handler for selected element
  const startElementMoveDrag = (e: React.PointerEvent) => {
    const el = selectedElRef.current;
    if (!el || !selected) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const curPos = (draft.styles["position"] || cs.position || "static").toLowerCase();
    const targetPos = curPos === "static" ? "relative" : curPos;
    const isAbsOrFixed = targetPos === "absolute" || targetPos === "fixed";

    const origLeft =
      curPos === "static"
        ? 0
        : (parsePxValue(draft.styles["left"]) ?? parsePxValue(cs.left) ?? 0);
    const origTop =
      curPos === "static"
        ? 0
        : (parsePxValue(draft.styles["top"]) ?? parsePxValue(cs.top) ?? 0);
    const preserveWidth =
      isAbsOrFixed && !draft.styles["width"] && rect.width > 0
        ? `${Math.round(rect.width)}px`
        : null;

    const onMove = (ev: PointerEvent) => {
      const dx = Math.round(ev.clientX - startX);
      const dy = Math.round(ev.clientY - startY);
      setDraft((d) => {
        const next = { ...d.styles };
        next["position"] = targetPos;
        next["left"] = `${Math.round(origLeft + dx)}px`;
        next["top"] = `${Math.round(origTop + dy)}px`;
        if (isAbsOrFixed) {
          next["right"] = "auto";
          next["bottom"] = "auto";
          if (preserveWidth && !next["width"]) {
            next["width"] = preserveWidth;
          }
        }
        return { ...d, styles: next };
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Direct on-canvas 8-handle Resize handler for selected element
  const startElementResizeDrag = (e: React.PointerEvent, dir: ResizeHandleDir) => {
    const el = selectedElRef.current;
    if (!el || !selected) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);

    const origW = Math.round(rect.width);
    const origH = Math.round(rect.height);
    const curPos = (draft.styles["position"] || cs.position || "static").toLowerCase();
    const needsShiftX = dir.includes("w");
    const needsShiftY = dir.includes("n");
    const targetPos =
      (needsShiftX || needsShiftY) && curPos === "static" ? "relative" : curPos;
    const isAbsOrFixed = targetPos === "absolute" || targetPos === "fixed";

    const origLeft =
      curPos === "static"
        ? 0
        : (parsePxValue(draft.styles["left"]) ?? parsePxValue(cs.left) ?? 0);
    const origTop =
      curPos === "static"
        ? 0
        : (parsePxValue(draft.styles["top"]) ?? parsePxValue(cs.top) ?? 0);
    const parsedMaxW = parsePxValue(cs.maxWidth);
    const parsedMinW = parsePxValue(cs.minWidth);

    const onMove = (ev: PointerEvent) => {
      const dx = Math.round(ev.clientX - startX);
      const dy = Math.round(ev.clientY - startY);

      setDraft((d) => {
        const next = { ...d.styles };
        if (cs.display === "inline" && !next["display"]) {
          next["display"] = "inline-block";
        }
        if (cs.boxSizing !== "border-box" && !next["box-sizing"]) {
          next["box-sizing"] = "border-box";
        }

        if (dir.includes("e") || dir.includes("w")) {
          const rawW = dir.includes("e") ? origW + dx : origW - dx;
          const nextW = Math.max(24, rawW);
          next["width"] = `${nextW}px`;
          if (parsedMaxW !== null && nextW > parsedMaxW) {
            next["max-width"] = "none";
          }
          if (parsedMinW !== null && nextW < parsedMinW) {
            next["min-width"] = "0px";
          }
          if (needsShiftX) {
            const actualDx = origW - nextW;
            next["position"] = targetPos;
            next["left"] = `${Math.round(origLeft + actualDx)}px`;
            if (isAbsOrFixed) next["right"] = "auto";
          }
        }

        if (dir.includes("s") || dir.includes("n")) {
          const rawH = dir.includes("s") ? origH + dy : origH - dy;
          const nextH = Math.max(20, rawH);
          next["height"] = `${nextH}px`;
          if (needsShiftY) {
            const actualDy = origH - nextH;
            next["position"] = targetPos;
            next["top"] = `${Math.round(origTop + actualDy)}px`;
            if (isAbsOrFixed) next["bottom"] = "auto";
          }
        }

        return { ...d, styles: next };
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Live preview a Hero globe patch
  const applyHeroGlobeDraft = (patch: Record<string, string | number | boolean>) => {
    const base = globePatchDraft ?? globeSettings ?? {};
    const merged = { ...base, ...patch };
    setGlobePatchDraft(merged);
    window.dispatchEvent(new CustomEvent("neeleh-globe-updated", { detail: merged }));
  };

  // Call Gemini AI Inspector endpoint
  const runAiEdit = async (e?: React.FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    if (!selected) return;
    const textPrompt = (overridePrompt ?? aiPrompt).trim();
    if (textPrompt.length < 2) return;

    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/dashboard/inspector-ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textPrompt,
          pathname: normPath,
          lang,
          element: {
            selector: selected.selector,
            tagName: selected.tagName,
            text: draft.textDirty ? draft.text : selected.text,
            classes: selected.classes,
            computedStyles: selected.computed,
            isHeroScene: selected.isHeroScene,
          },
          globeSettings: selected.isHeroScene ? (globePatchDraft ?? globeSettings) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (fa ? "خطا در اجرای دستور AI" : "AI request failed"));
      }

      setDraft((d) => ({
        ...d,
        ...(typeof data.text === "string" ? { text: data.text, textDirty: true } : {}),
        ...(data.hidden === true ? { hidden: true } : {}),
        styles: { ...d.styles, ...(data.styles ?? {}) },
        ...(typeof data.customCss === "string" && data.customCss
          ? {
              customCss: d.customCss
                ? `${d.customCss}\n${data.customCss}`
                : data.customCss,
            }
          : {}),
      }));

      if (data.globePatch && typeof data.globePatch === "object") {
        applyHeroGlobeDraft(data.globePatch as GlobeSettings);
      }

      setAiNote(data.explanation || (fa ? "تغییرات روی پیش‌نمایش اعمال شد." : "Changes applied to preview."));
      setAiModelBadge(data.model || null);
    } catch (err) {
      toast({
        title: fa ? "خطا در هوش مصنوعی" : "AI Error",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Persist current draft (CSS/Text + optional Hero Globe) to DB
  const saveChanges = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const targetPath = draft.scope === "global" ? "*" : normPath;
      const res = await fetch("/api/dashboard/live-overrides/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          rule: {
            path: targetPath,
            selector: selected.selector,
            label: selected.label,
            ...(draft.textDirty ? { text: draft.text } : {}),
            styles: draft.styles,
            customCss: draft.customCss,
            hidden: draft.hidden,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (fa ? "ذخیره ناموفق بود" : "Save failed"));
      }
      if (Array.isArray(data.rules)) setRules(data.rules);

      if (globePatchDraft) {
        const gRes = await fetch("/api/tm/globe-config/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: globePatchDraft }),
        });
        if (gRes.ok) {
          setGlobeSettings(globePatchDraft);
        }
      }

      toast({
        title: fa ? "تغییرات ذخیره شد" : "Changes saved",
        description: fa
          ? "اصلاحات این آبجکت به‌صورت دائمی روی سایت ثبت گردید."
          : "Visual and content overrides have been persisted.",
      });
    } catch (err) {
      toast({
        title: fa ? "خطا در ذخیره" : "Save failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetCurrentDraft = async () => {
    if (!selected) return;
    const existing =
      rules.find((r) => r.selector === selected.selector && r.path === normPath) ??
      rules.find((r) => r.selector === selected.selector && r.path === "*");

    setDraft({
      text: selected.text,
      textDirty: false,
      styles: {},
      customCss: "",
      hidden: false,
      scope: "page",
    });
    setAiNote(null);
    if (globeSettings) {
      setGlobePatchDraft(null);
      window.dispatchEvent(new CustomEvent("neeleh-globe-updated", { detail: globeSettings }));
    }

    if (existing) {
      await deleteRuleById(existing.id);
    }
  };

  const deleteRuleById = async (id: string) => {
    try {
      const res = await fetch("/api/dashboard/live-overrides/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rules)) {
        setRules(data.rules);
        toast({ title: fa ? "تغییر حذف شد" : "Override removed" });
      }
    } catch {
      // silent
    }
  };

  if (!mounted || !isAdmin || isDashboard) {
    return null;
  }

  const pageRulesCount = rules.filter((r) => r.path === normPath || r.path === "*").length;

  const quickPrompts = fa
    ? [
        "رنگ این بخش را زرشکی برند و برجسته‌تر کن",
        "سایز نوشته را بزرگ‌تر و فاصله خطوط را متعادل‌تر کن",
        "پس‌زمینه شیشه‌ای ملایم با کادر باریک و سایه نرم بده",
        "متن این بخش را حرفه‌ای‌تر و کوتاه‌تر بازنویسی کن",
      ]
    : [
        "Style with Neeleh crimson accent & bolder contrast",
        "Increase typography scale and tighten spacing",
        "Add subtle frosted surface, 1px hairline border & soft depth",
        "Rewrite copy more concisely in an architectural tone",
      ];

  const panelStyle: React.CSSProperties =
    dockMode === "dock"
      ? {
          position: "fixed",
          top: 0,
          bottom: 0,
          insetInlineEnd: 0,
          width: Math.min(size.w, Math.max(320, window.innerWidth - 16)),
          height: "100vh",
          zIndex: 5050,
        }
      : {
          position: "fixed",
          left: Math.min(pos.x, Math.max(8, window.innerWidth - size.w - 8)),
          top: Math.min(pos.y, Math.max(8, window.innerHeight - 60)),
          width: Math.min(size.w, Math.max(320, window.innerWidth - 16)),
          height: minimized ? 48 : Math.min(size.h, Math.max(280, window.innerHeight - 16)),
          zIndex: 5050,
        };

  return (
    <div data-live-inspector-ui="true" dir={fa ? "rtl" : "ltr"}>
      {/* 1. Hover Highlight Overlay (only while Pick Mode active) */}
      {pickMode && hoverRect && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
            zIndex: 4990,
            pointerEvents: "none",
            border: "1.5px dashed #2563eb",
            background: "rgba(37, 99, 235, 0.06)",
            transition: "all 60ms linear",
          }}
        >
          <span
            dir="ltr"
            style={{
              position: "absolute",
              top: hoverRect.top > 24 ? -22 : 2,
              left: 0,
              background: "#18181b",
              color: "#ffffff",
              fontSize: 10.5,
              fontFamily: "var(--font-mono-tech), monospace",
              padding: "2px 6px",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {hoverRect.label}
          </span>
        </div>
      )}

      {/* 2. Active Selected Element Outline + Direct Move / 8-Handle Resize Gizmo */}
      {panelOpen && selectedRect && (() => {
        const canDirect = Boolean(
          selected &&
            directTransformOn &&
            !pickMode &&
            !draft.hidden &&
            !["canvas", "html", "body"].includes(selected.tagName),
        );
        const wPx = Math.round(selectedRect.width);
        const hPx = Math.round(selectedRect.height);
        const handleDefs: { dir: ResizeHandleDir; cursor: string; style: React.CSSProperties }[] = [
          { dir: "nw", cursor: "nwse-resize", style: { top: -5, left: -5 } },
          { dir: "n", cursor: "ns-resize", style: { top: -5, left: "50%", transform: "translateX(-50%)" } },
          { dir: "ne", cursor: "nesw-resize", style: { top: -5, right: -5 } },
          { dir: "e", cursor: "ew-resize", style: { top: "50%", right: -5, transform: "translateY(-50%)" } },
          { dir: "se", cursor: "nwse-resize", style: { bottom: -5, right: -5 } },
          { dir: "s", cursor: "ns-resize", style: { bottom: -5, left: "50%", transform: "translateX(-50%)" } },
          { dir: "sw", cursor: "nesw-resize", style: { bottom: -5, left: -5 } },
          { dir: "w", cursor: "ew-resize", style: { top: "50%", left: -5, transform: "translateY(-50%)" } },
        ];
        return (
          <div
            aria-hidden={!canDirect}
            onPointerDown={canDirect ? startElementMoveDrag : undefined}
            title={
              canDirect
                ? fa
                  ? "برای جابه‌جایی بکشید — از دستگیره‌های لبه‌ها برای تغییر اندازه استفاده کنید"
                  : "Drag to move — drag corner/edge handles to resize"
                : undefined
            }
            style={{
              position: "fixed",
              top: selectedRect.top,
              left: selectedRect.left,
              width: selectedRect.width,
              height: selectedRect.height,
              zIndex: 4995,
              pointerEvents: canDirect ? "auto" : "none",
              cursor: canDirect ? "move" : "default",
              border: "2px solid #d92b2b",
              background: canDirect ? "rgba(217, 43, 43, 0.05)" : "rgba(217, 43, 43, 0.04)",
              touchAction: canDirect ? "none" : "auto",
            }}
          >
            <div
              dir="ltr"
              onPointerDown={canDirect ? startElementMoveDrag : undefined}
              style={{
                position: "absolute",
                top: selectedRect.top > 26 ? -24 : 2,
                left: 0,
                background: "#d92b2b",
                color: "#ffffff",
                fontSize: 10.5,
                fontFamily: "var(--font-mono-tech), monospace",
                padding: "2px 7px",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: canDirect ? "move" : "default",
                pointerEvents: canDirect ? "auto" : "none",
                userSelect: "none",
              }}
            >
              {canDirect && <Move className="w-3 h-3" />}
              <span>{selectedRect.label}</span>
              <span style={{ opacity: 0.85 }}>{wPx}×{hPx}</span>
            </div>

            {canDirect &&
              handleDefs.map((h) => (
                <div
                  key={h.dir}
                  role="slider"
                  aria-label={`Resize ${h.dir}`}
                  aria-valuenow={wPx}
                  tabIndex={-1}
                  onPointerDown={(ev) => startElementResizeDrag(ev, h.dir)}
                  style={{
                    position: "absolute",
                    width: 10,
                    height: 10,
                    background: "#ffffff",
                    border: "2px solid #d92b2b",
                    cursor: h.cursor,
                    pointerEvents: "auto",
                    touchAction: "none",
                    ...h.style,
                  }}
                />
              ))}
          </div>
        );
      })()}

      {/* 3. Admin Discreet Floating Launcher Bar */}
      <div
        className="fixed bottom-14 md:bottom-3 right-3 md:right-4 z-[3050] flex items-center gap-1.5 border border-neutral-300 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md text-neutral-900"
        style={{ fontSize: 12 }}
      >
        <button
          type="button"
          onClick={() => setPickMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 font-medium transition-colors ${
            pickMode
              ? "bg-[#d92b2b] text-white"
              : "bg-neutral-900 text-white hover:bg-neutral-800"
          }`}
          title={fa ? "کلیک روی هر آبجکت صفحه برای ویرایش" : "Click any element on the scene to edit"}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>
            {pickMode
              ? fa
                ? "روی آبجکت کلیک کنید (Esc)"
                : "Click an object (Esc)"
              : fa
                ? "بازرس صحنه"
                : "Scene Inspector"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (panelOpen && minimized) {
              setMinimized(false);
            } else {
              setPanelOpen((v) => !v);
              setMinimized(false);
            }
          }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-neutral-800 hover:bg-neutral-100"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{panelOpen && !minimized ? (fa ? "بستن پنل" : "Hide Panel") : fa ? "پنل همراه" : "Companion"}</span>
          {pageRulesCount > 0 && (
            <span className="font-mono tabular-nums text-[11px] text-[#d92b2b] font-semibold">
              ({pageRulesCount})
            </span>
          )}
        </button>
      </div>

      {/* 4. Resizable, Draggable, Dockable Companion Panel */}
      {panelOpen && (
        <aside
          aria-label={fa ? "پنل همراه ویرایش صحنه" : "Live Scene Inspector Panel"}
          style={panelStyle}
          className="flex flex-col border border-neutral-300 bg-white text-neutral-900 shadow-2xl overflow-hidden select-none"
        >
          {/* Header Bar (Draggable in Float Mode) */}
          <div
            onPointerDown={startDrag}
            onDoubleClick={() => {
              if (dockMode === "float") setMinimized((v) => !v);
            }}
            className={`flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-950 px-3 py-2 text-white ${
              dockMode === "float" ? "cursor-move" : ""
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {dockMode === "float" && <Move className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
              <span className="text-xs font-semibold truncate">
                {fa ? "ویرایشگر زنده صحنه و AI" : "Live Scene & AI Studio"}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Quick width presets */}
              {!minimized && (
                <button
                  type="button"
                  onClick={() =>
                    setSize((s) => ({
                      ...s,
                      w: s.w < 410 ? 440 : s.w < 540 ? 580 : 360,
                    }))
                  }
                  className="px-1.5 py-1 text-[10.5px] font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  title={fa ? "تغییر سریع عرض پنل" : "Cycle panel width"}
                >
                  {size.w}px
                </button>
              )}

              {/* Dock / Float Switch */}
              <button
                type="button"
                onClick={() => {
                  setMinimized(false);
                  setDockMode((m) => (m === "float" ? "dock" : "float"));
                }}
                className="p-1 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                title={
                  dockMode === "float"
                    ? fa
                      ? "چسباندن به کنار صفحه"
                      : "Dock to side"
                    : fa
                      ? "حالت پنجره شناور"
                      : "Float window"
                }
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              {/* Minimize / Expand */}
              {dockMode === "float" && (
                <button
                  type="button"
                  onClick={() => setMinimized((v) => !v)}
                  className="p-1 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  title={minimized ? (fa ? "باز کردن پنل" : "Expand") : fa ? "جمع‌کردن پنل" : "Minimize"}
                >
                  {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  setPickMode(false);
                }}
                className="p-1 text-neutral-300 hover:bg-[#d92b2b] hover:text-white"
                title={fa ? "بستن پنل" : "Close"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Target Element Selector & Tree Stepper */}
              <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-neutral-500">
                    {selected
                      ? fa
                        ? "آبجکت انتخاب‌شده"
                        : "Selected object"
                      : fa
                        ? "هنوز آبجکتی انتخاب نشده است"
                        : "No object selected"}
                  </div>
                  <div
                    className="text-xs font-medium text-neutral-900 truncate font-mono"
                    dir="ltr"
                    title={selected?.selector ?? ""}
                  >
                    {selected ? selected.label : "—"}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {selected && (
                    <>
                      <button
                        type="button"
                        onClick={stepParent}
                        className="p-1.5 border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                        title={fa ? "انتخاب لایه والد" : "Select parent"}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={stepChild}
                        className="p-1.5 border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                        title={fa ? "انتخاب لایه فرزند" : "Select child"}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setPickMode((v) => !v)}
                    className={`inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium border ${
                      pickMode
                        ? "border-[#d92b2b] bg-[#d92b2b] text-white"
                        : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100"
                    }`}
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>{pickMode ? (fa ? "لغو" : "Cancel") : fa ? "انتخاب از صحنه" : "Pick"}</span>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 border-b border-neutral-200 bg-white text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("ai")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
                    activeTab === "ai"
                      ? "border-[#d92b2b] text-neutral-950 font-semibold bg-neutral-50/70"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{fa ? "پرامپت AI" : "AI Prompt"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
                    activeTab === "visual"
                      ? "border-[#d92b2b] text-neutral-950 font-semibold bg-neutral-50/70"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{fa ? "تنظیمات" : "Inspect"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("rules")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
                    activeTab === "rules"
                      ? "border-[#d92b2b] text-neutral-950 font-semibold bg-neutral-50/70"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {fa ? "تغییرات" : "Rules"} ({rules.length})
                  </span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 select-text">
                {activeTab !== "rules" && !selected && (
                  <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center space-y-3">
                    <Crosshair className="w-6 h-6 mx-auto text-[#d92b2b]" />
                    <p className="text-xs leading-6 text-neutral-700">
                      {fa
                        ? "روی «انتخاب از صحنه» کلیک کنید و سپس هر آبجکتی (تیتر، دکمه، کارت یا کره سه‌بعدی Hero) را انتخاب کنید تا تنظیمات و پرامپت هوش مصنوعی آن فعال شود."
                        : "Click Pick above and choose any element on the page (heading, button, card, or 3D Hero sphere) to customize it or edit via AI."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPickMode(true)}
                      className="inline-flex items-center gap-1.5 bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{fa ? "شروع انتخاب از صحنه" : "Pick element on scene"}</span>
                    </button>
                  </div>
                )}

                {/* ── TAB 1: AI PROMPT COMPANION ── */}
                {activeTab === "ai" && selected && (
                  <div className="space-y-3.5">
                    <form onSubmit={runAiEdit} className="space-y-2.5">
                      <label className="block text-xs font-medium text-neutral-800">
                        {fa
                          ? "دستور تغییرات دلخواه برای هوش مصنوعی:"
                          : "Describe changes for this element:"}
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={4}
                        placeholder={
                          selected.isHeroScene
                            ? fa
                              ? "مثلاً: رنگ شیشه کره را یخی‌تر کن، شعاعش را کمی بزرگ‌تر کن و گرادیان پس‌زمینه را ملایم‌تر کن..."
                              : "e.g. Make the glass sphere cooler icy tone, slightly larger radius, softer backdrop..."
                            : fa
                              ? "مثلاً: رنگ این تیتر را زرشکی کن، فونتش را بزرگ‌تر و فاصله پایینش را بیشتر کن، یا متنش را حرفه‌ای‌تر بنویس..."
                              : "e.g. Make this headline crimson, larger font size, add spacing below, or rewrite copy..."
                        }
                        className="w-full border border-neutral-300 bg-white p-2.5 text-xs leading-6 text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                          <span>{fa ? "محدوده:" : "Scope:"}</span>
                          <select
                            value={draft.scope}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                scope: e.target.value === "global" ? "global" : "page",
                              }))
                            }
                            className="border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-800"
                          >
                            <option value="page">{fa ? `فقط صفحه فعلی (${normPath})` : `This page (${normPath})`}</option>
                            <option value="global">{fa ? "کل سایت" : "Site-wide"}</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={aiLoading || aiPrompt.trim().length < 2}
                          className="inline-flex items-center gap-1.5 bg-[#d92b2b] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#b91c1c] disabled:opacity-50"
                        >
                          {aiLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>{aiLoading ? (fa ? "در حال تحلیل..." : "Applying...") : fa ? "اعمال با AI" : "Run AI Edit"}</span>
                        </button>
                      </div>
                    </form>

                    {/* Quick AI Prompt Suggestions */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] text-neutral-500">
                        {fa ? "پیشنهادهای سریع:" : "Quick prompts:"}
                      </div>
                      <div className="flex flex-col gap-1">
                        {quickPrompts.map((qp, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={aiLoading}
                            onClick={() => {
                              setAiPrompt(qp);
                              void runAiEdit(undefined, qp);
                            }}
                            className="text-start border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11.5px] text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100 transition-colors"
                          >
                            {qp}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Result Summary */}
                    {aiNote && (
                      <div className="border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span className="inline-flex items-center gap-1 font-medium text-neutral-900">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            {fa ? "پیش‌نمایش AI آماده است" : "AI preview active"}
                          </span>
                          {aiModelBadge && <span className="font-mono text-[10px]">{aiModelBadge}</span>}
                        </div>
                        <p className="text-xs leading-6 text-neutral-800">{aiNote}</p>
                        {Object.keys(draft.styles).length > 0 && (
                          <pre
                            dir="ltr"
                            className="max-h-28 overflow-auto border border-neutral-200 bg-white p-2 text-[10.5px] font-mono text-neutral-700"
                          >
                            {Object.entries(draft.styles)
                              .map(([k, v]) => `${k}: ${v};`)
                              .join("\n")}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: MANUAL VISUAL & TEXT INSPECTOR ── */}
                {activeTab === "visual" && selected && (
                  <div className="space-y-4 text-xs">
                    {/* Text Content Editor */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-neutral-800">
                          {fa ? "متن آبجکت" : "Text content"}
                        </label>
                        {draft.textDirty && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({ ...d, text: selected.text, textDirty: false }))
                            }
                            className="text-[11px] text-[#d92b2b] hover:underline"
                          >
                            {fa ? "بازگردانی متن اصلی" : "Reset text"}
                          </button>
                        )}
                      </div>
                      {selected.canEditText ? (
                        <textarea
                          rows={2}
                          value={draft.text}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, text: e.target.value, textDirty: true }))
                          }
                          className="w-full border border-neutral-300 bg-white p-2 text-xs leading-5 text-neutral-900"
                        />
                      ) : (
                        <p className="border border-neutral-200 bg-neutral-50 p-2 text-[11px] text-neutral-500">
                          {fa
                            ? "این لایه شامل زیرمجموعه‌های پیچیده/گرافیکی است؛ برای تغییر متن روی لایه فرزند کلیک کنید."
                            : "Container includes nested graphics/children; step into a child element to edit text safely."}
                        </p>
                      )}
                    </div>

                    {/* Position & Dimensions (Live Layout + On-Canvas Move/Resize) */}
                    <div className="space-y-3 border-t border-neutral-200 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <Move className="w-3.5 h-3.5 text-[#d92b2b]" />
                          <span>{fa ? "موقعیت و ابعاد (Position & Size)" : "Position & Size"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={resetElementPositionAndSize}
                          className="text-[11px] text-neutral-500 hover:text-[#d92b2b] transition-colors"
                          title={fa ? "بازگردانی موقعیت و ابعاد" : "Reset position & size"}
                        >
                          {fa ? "بازنشانی مکان/ابعاد" : "Reset layout"}
                        </button>
                      </div>

                      {/* Direct On-Canvas Move/Resize Toggle */}
                      {!["canvas", "html", "body"].includes(selected.tagName) && (
                        <div className="flex items-center justify-between gap-2 border border-neutral-200 bg-neutral-50 px-2.5 py-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-neutral-900">
                              {fa ? "جابه‌جایی و تغییر اندازه مستقیم روی صحنه" : "Direct Canvas Move & Resize"}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              {fa
                                ? "کادر قرمز را بکشید تا جابه‌جا شود یا از دستگیره‌ها اندازه را تغییر دهید"
                                : "Drag the element box to move, drag corners/edges to resize"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDirectTransformOn((v) => !v)}
                            className={`shrink-0 px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                              directTransformOn
                                ? "border-[#d92b2b] bg-[#d92b2b] text-white"
                                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            {directTransformOn ? (fa ? "فعال" : "Active") : fa ? "خاموش" : "Off"}
                          </button>
                        </div>
                      )}

                      {/* Quick 4-Way Nudge Pad + Step Selector */}
                      <div className="flex items-center justify-between gap-2 border border-neutral-200 bg-white px-2.5 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => nudgeSelectedElement(0, -nudgeStep)}
                            className="p-1.5 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800"
                            title={fa ? "حرکت به بالا" : "Move up"}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeSelectedElement(0, nudgeStep)}
                            className="p-1.5 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800"
                            title={fa ? "حرکت به پایین" : "Move down"}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeSelectedElement(-nudgeStep, 0)}
                            className="p-1.5 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800"
                            title={fa ? "حرکت به چپ" : "Move left"}
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeSelectedElement(nudgeStep, 0)}
                            className="p-1.5 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800"
                            title={fa ? "حرکت به راست" : "Move right"}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[10.5px] font-mono">
                          <span className="text-neutral-500 me-1">{fa ? "گام:" : "Step:"}</span>
                          {([1, 8, 24] as const).map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setNudgeStep(step)}
                              className={`px-1.5 py-0.5 border tabular-nums ${
                                nudgeStep === step
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              {step}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Position Mode + Z-Index */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] text-neutral-600">
                            {fa ? "نوع قرارگیری (Position)" : "Position"}
                          </label>
                          <select
                            dir="ltr"
                            value={draft.styles["position"] ?? ""}
                            onChange={(e) => setStyleProp("position", e.target.value)}
                            className="w-full border border-neutral-300 bg-white px-2 py-1.5 text-[11px] font-mono"
                          >
                            <option value="">
                              {fa
                                ? `پیش‌فرض (${selected.computed.position})`
                                : `Default (${selected.computed.position})`}
                            </option>
                            <option value="static">static</option>
                            <option value="relative">relative</option>
                            <option value="absolute">absolute</option>
                            <option value="fixed">fixed</option>
                            <option value="sticky">sticky</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] text-neutral-600">
                            {fa ? "ترتیب لایه (z-index)" : "Z-Index"}
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["z-index"] ?? ""}
                            placeholder={selected.computed.zIndex}
                            onChange={(e) => setStyleProp("z-index", e.target.value)}
                            className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      {/* Top / Right / Bottom / Left Offsets */}
                      <div className="grid grid-cols-4 gap-2">
                        {(
                          [
                            ["top", "بالا (Top)", "Top"],
                            ["right", "راست (Right)", "Right"],
                            ["bottom", "پایین (Bottom)", "Bottom"],
                            ["left", "چپ (Left)", "Left"],
                          ] as const
                        ).map(([prop, faLabel, enLabel]) => (
                          <div key={prop} className="space-y-1">
                            <label className="block text-[10.5px] text-neutral-600 truncate">
                              {fa ? faLabel : enLabel}
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              value={draft.styles[prop] ?? ""}
                              placeholder={selected.computed[prop]}
                              onChange={(e) => setStyleProp(prop, e.target.value)}
                              className="w-full border border-neutral-300 px-1.5 py-1 text-[11px] font-mono tabular-nums"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Width / Height / Max-Width / Min-Height */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-neutral-600">
                              {fa ? "عرض (Width)" : "Width"}
                            </label>
                            <div className="flex items-center gap-1 font-mono text-[10px]">
                              <button
                                type="button"
                                onClick={() => setStyleProp("width", "auto")}
                                className="px-1 border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                              >
                                auto
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStyleProp("width", "100%");
                                  setStyleProp("max-width", "none");
                                }}
                                className="px-1 border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                              >
                                100%
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["width"] ?? ""}
                            placeholder={selected.computed.width}
                            onChange={(e) => setStyleProp("width", e.target.value)}
                            className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-neutral-600">
                              {fa ? "ارتفاع (Height)" : "Height"}
                            </label>
                            <button
                              type="button"
                              onClick={() => setStyleProp("height", "auto")}
                              className="px-1 border border-neutral-200 font-mono text-[10px] text-neutral-600 hover:bg-neutral-100"
                            >
                              auto
                            </button>
                          </div>
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["height"] ?? ""}
                            placeholder={selected.computed.height}
                            onChange={(e) => setStyleProp("height", e.target.value)}
                            className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] text-neutral-600">
                            {fa ? "حداکثر عرض (Max Width)" : "Max Width"}
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["max-width"] ?? ""}
                            placeholder={selected.computed.maxWidth}
                            onChange={(e) => setStyleProp("max-width", e.target.value)}
                            className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] text-neutral-600">
                            {fa ? "حداقل ارتفاع (Min Height)" : "Min Height"}
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["min-height"] ?? ""}
                            placeholder={selected.computed.minHeight}
                            onChange={(e) => setStyleProp("min-height", e.target.value)}
                            className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "رنگ متن" : "Text color"}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={rgbToHex(draft.styles["color"] || selected.computed.color)}
                            onChange={(e) => setStyleProp("color", e.target.value)}
                            className="h-8 w-8 cursor-pointer border border-neutral-300 bg-white p-0.5"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["color"] ?? ""}
                            placeholder={selected.computed.color}
                            onChange={(e) => setStyleProp("color", e.target.value)}
                            className="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-[11px] font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "رنگ پس‌زمینه" : "Background"}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={rgbToHex(
                              draft.styles["background-color"] ||
                                selected.computed.backgroundColor ||
                                "#ffffff",
                            )}
                            onChange={(e) => setStyleProp("background-color", e.target.value)}
                            className="h-8 w-8 cursor-pointer border border-neutral-300 bg-white p-0.5"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={draft.styles["background-color"] ?? ""}
                            placeholder={selected.computed.backgroundColor || "transparent"}
                            onChange={(e) => setStyleProp("background-color", e.target.value)}
                            className="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-[11px] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "اندازه فونت" : "Font size"}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draft.styles["font-size"] ?? ""}
                          placeholder={selected.computed.fontSize}
                          onChange={(e) => setStyleProp("font-size", e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "ضخامت فونت" : "Font weight"}
                        </label>
                        <select
                          value={draft.styles["font-weight"] ?? ""}
                          onChange={(e) => setStyleProp("font-weight", e.target.value)}
                          className="w-full border border-neutral-300 bg-white px-2 py-1.5 text-[11px] font-mono"
                        >
                          <option value="">{fa ? `پیش‌فرض (${selected.computed.fontWeight})` : `Default (${selected.computed.fontWeight})`}</option>
                          <option value="300">300 (Light)</option>
                          <option value="400">400 (Regular)</option>
                          <option value="500">500 (Medium)</option>
                          <option value="600">600 (SemiBold)</option>
                          <option value="700">700 (Bold)</option>
                          <option value="800">800 (ExtraBold)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "فاصله خطوط" : "Line height"}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draft.styles["line-height"] ?? ""}
                          placeholder={selected.computed.lineHeight}
                          onChange={(e) => setStyleProp("line-height", e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "تراز متن" : "Text align"}
                        </label>
                        <select
                          value={draft.styles["text-align"] ?? ""}
                          onChange={(e) => setStyleProp("text-align", e.target.value)}
                          className="w-full border border-neutral-300 bg-white px-2 py-1.5 text-[11px]"
                        >
                          <option value="">{fa ? "پیش‌فرض" : "Default"}</option>
                          <option value="right">{fa ? "راست" : "Right"}</option>
                          <option value="center">{fa ? "وسط" : "Center"}</option>
                          <option value="left">{fa ? "چپ" : "Left"}</option>
                        </select>
                      </div>
                    </div>

                    {/* Box Spacing & Opacity */}
                    <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "فاصله داخلی (Padding)" : "Padding"}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draft.styles["padding"] ?? ""}
                          placeholder={selected.computed.padding}
                          onChange={(e) => setStyleProp("padding", e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "فاصله بیرونی (Margin)" : "Margin"}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draft.styles["margin"] ?? ""}
                          placeholder={selected.computed.margin}
                          onChange={(e) => setStyleProp("margin", e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "گردی گوشه (Radius)" : "Border radius"}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draft.styles["border-radius"] ?? ""}
                          placeholder={selected.computed.borderRadius}
                          onChange={(e) => setStyleProp("border-radius", e.target.value)}
                          className="w-full border border-neutral-300 px-2 py-1.5 text-[11px] font-mono tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] text-neutral-600">
                          {fa ? "شفافیت (Opacity)" : "Opacity"}
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={Number(draft.styles["opacity"] ?? selected.computed.opacity ?? 1)}
                            onChange={(e) => setStyleProp("opacity", e.target.value)}
                            className="flex-1 accent-neutral-900"
                          />
                          <span className="font-mono text-[11px] tabular-nums w-8 text-end">
                            {draft.styles["opacity"] ?? selected.computed.opacity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visibility & Scope */}
                    <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, hidden: !d.hidden }))}
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-medium ${
                          draft.hidden
                            ? "border-[#d92b2b] bg-[#d92b2b]/10 text-[#d92b2b]"
                            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {draft.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{draft.hidden ? (fa ? "مخفی شده" : "Hidden") : fa ? "نمایش عادی" : "Visible"}</span>
                      </button>

                      <select
                        value={draft.scope}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            scope: e.target.value === "global" ? "global" : "page",
                          }))
                        }
                        className="border border-neutral-300 bg-white px-2 py-1.5 text-[11px] text-neutral-800"
                      >
                        <option value="page">{fa ? `مسیر: ${normPath}` : `Path: ${normPath}`}</option>
                        <option value="global">{fa ? "کل سایت (*)" : "Site-wide (*)"}</option>
                      </select>
                    </div>

                    {/* Hero Sphere Quick Controls (when Hero scene is selected) */}
                    {selected.isHeroScene && (globePatchDraft || globeSettings) && (
                      <div className="border border-neutral-300 bg-neutral-50 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-900">
                            {fa ? "تنظیمات سریع کره Hero" : "Hero Sphere Quick Controls"}
                          </span>
                          <Link
                            href="/dashboard/globe"
                            className="text-[11px] text-[#d92b2b] hover:underline"
                          >
                            {fa ? "تنظیمات کامل ←" : "Full Studio →"}
                          </Link>
                        </div>

                        {(() => {
                          const g = globePatchDraft ?? globeSettings ?? {};
                          return (
                            <div className="grid grid-cols-2 gap-2.5">
                              <label className="space-y-1">
                                <span className="text-[11px] text-neutral-600">
                                  {fa ? "شعاع کره" : "Radius"} ({Number(g.sz ?? 5)})
                                </span>
                                <input
                                  type="range"
                                  min={1.5}
                                  max={9}
                                  step={0.1}
                                  value={Number(g.sz ?? 5)}
                                  onChange={(e) => applyHeroGlobeDraft({ sz: Number(e.target.value) })}
                                  className="w-full accent-neutral-900"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] text-neutral-600">
                                  {fa ? "موقعیت افقی X" : "Sphere X"} ({Number(g.spx ?? 0)})
                                </span>
                                <input
                                  type="range"
                                  min={-9}
                                  max={9}
                                  step={0.1}
                                  value={Number(g.spx ?? 0)}
                                  onChange={(e) => applyHeroGlobeDraft({ spx: Number(e.target.value) })}
                                  className="w-full accent-neutral-900"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] text-neutral-600">
                                  {fa ? "ارتفاع کره Y" : "Sphere Y"} ({Number(g.spy ?? -3.8)})
                                </span>
                                <input
                                  type="range"
                                  min={-6}
                                  max={6}
                                  step={0.1}
                                  value={Number(g.spy ?? -3.8)}
                                  onChange={(e) => applyHeroGlobeDraft({ spy: Number(e.target.value) })}
                                  className="w-full accent-neutral-900"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[11px] text-neutral-600">
                                  {fa ? "رنگ شیشه" : "Glass Tint"}
                                </span>
                                <input
                                  type="color"
                                  value={String(g.gc1 ?? "#ff9d7d")}
                                  onChange={(e) =>
                                    applyHeroGlobeDraft({ gcm: true, gc1: e.target.value })
                                  }
                                  className="h-7 w-full cursor-pointer border border-neutral-300 bg-white p-0.5"
                                />
                              </label>
                              <label className="space-y-1 col-span-2">
                                <span className="text-[11px] text-neutral-600">
                                  {fa ? "رنگ ذرات" : "Particle Color"}
                                </span>
                                <input
                                  type="color"
                                  value={String(g.ac ?? "#4c8694")}
                                  onChange={(e) => applyHeroGlobeDraft({ ac: e.target.value })}
                                  className="h-7 w-full cursor-pointer border border-neutral-300 bg-white p-0.5"
                                />
                              </label>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Custom Scoped CSS */}
                    <div className="space-y-1 border-t border-neutral-200 pt-3">
                      <label className="block text-[11px] text-neutral-600">
                        {fa ? "CSS سفارشی برای این آبجکت" : "Custom CSS declarations"}
                      </label>
                      <textarea
                        dir="ltr"
                        rows={3}
                        value={draft.customCss}
                        onChange={(e) => setDraft((d) => ({ ...d, customCss: e.target.value }))}
                        placeholder="letter-spacing: 0.04em; box-shadow: 0 12px 30px rgba(0,0,0,0.08);"
                        className="w-full border border-neutral-300 bg-neutral-50 p-2 text-[11px] font-mono text-neutral-800"
                      />
                    </div>
                  </div>
                )}

                {/* ── TAB 3: SAVED RULES LIST ── */}
                {activeTab === "rules" && (
                  <div className="space-y-2.5 text-xs">
                    {rules.length === 0 ? (
                      <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-neutral-500">
                        {fa
                          ? "هنوز تغییری برای آبجکت‌های سایت ذخیره نشده است."
                          : "No persisted scene overrides yet."}
                      </div>
                    ) : (
                      rules.map((r) => (
                        <div
                          key={r.id}
                          className="border border-neutral-200 bg-white p-2.5 flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-medium text-neutral-900 truncate">{r.label}</div>
                            <div className="flex items-center gap-2 text-[10.5px] text-neutral-500 font-mono">
                              <span>{r.path}</span>
                              <span>·</span>
                              <span className="truncate">{r.selector}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {(r.path === normPath || r.path === "*") && (
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.querySelector<HTMLElement>(r.selector);
                                  if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                    selectElement(el);
                                    setActiveTab("visual");
                                  }
                                }}
                                className="px-2 py-1 border border-neutral-200 text-[11px] text-neutral-700 hover:bg-neutral-100"
                              >
                                {fa ? "انتخاب" : "Select"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void deleteRuleById(r.id)}
                              className="p-1 text-neutral-400 hover:text-[#d92b2b]"
                              title={fa ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Footer Action Bar */}
              {selected && activeTab !== "rules" && (
                <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void resetCurrentDraft()}
                    className="inline-flex items-center gap-1.5 border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>{fa ? "بازگردانی" : "Reset"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((d) => ({
                          ...d,
                          textDirty: false,
                          styles: {},
                          customCss: "",
                          hidden: false,
                        }));
                        setAiNote(null);
                      }}
                      className="inline-flex items-center gap-1 border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
                      title={fa ? "لغو پیش‌نمایش بدون حذف قانون قبلی" : "Discard preview"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveChanges()}
                      className="inline-flex items-center gap-1.5 bg-neutral-950 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{saving ? (fa ? "در حال ذخیره..." : "Saving...") : fa ? "ذخیره دائمی" : "Save"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Resize Handles */}
              {dockMode === "float" ? (
                <>
                  <div
                    onPointerDown={(e) => startResize(e, "right")}
                    aria-hidden="true"
                    className="absolute top-10 bottom-3 right-0 w-1.5 cursor-ew-resize hover:bg-[#d92b2b]/30"
                  />
                  <div
                    onPointerDown={(e) => startResize(e, "left")}
                    aria-hidden="true"
                    className="absolute top-10 bottom-3 left-0 w-1.5 cursor-ew-resize hover:bg-[#d92b2b]/30"
                  />
                  <div
                    onPointerDown={(e) => startResize(e, "bottom")}
                    aria-hidden="true"
                    className="h-2 w-full cursor-ns-resize bg-neutral-100 border-t border-neutral-200 flex items-center justify-center hover:bg-neutral-200"
                  >
                    <GripHorizontal className="w-4 h-3 text-neutral-400" />
                  </div>
                  <div
                    onPointerDown={(e) => startResize(e, fa ? "corner-left" : "corner-right")}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      ...(fa ? { left: 0, cursor: "nesw-resize" } : { right: 0, cursor: "nwse-resize" }),
                      width: 14,
                      height: 14,
                    }}
                  />
                </>
              ) : (
                <div
                  onPointerDown={(e) => startResize(e, fa ? "right" : "left")}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    ...(fa ? { right: 0 } : { left: 0 }),
                    width: 6,
                    cursor: "ew-resize",
                  }}
                  className="hover:bg-[#d92b2b]/35"
                />
              )}
            </>
          )}
        </aside>
      )}
    </div>
  );
}
