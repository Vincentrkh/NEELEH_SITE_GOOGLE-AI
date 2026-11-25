"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Compass,
  Crosshair,
  ExternalLink,
  Layers,
  LogOut,
  Map as MapIcon,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useLang } from "@/components/language-provider";
import {
  DashboardSidebar,
  type DashboardUser,
} from "@/components/dashboard-sidebar";
import {
  CITY_NODES,
  filterNodesByRoles,
  findNodeForPath,
  type CityGroup,
  type CityNode,
} from "./city-data";
import {
  IsometricCityViewport,
  type DashboardStats,
} from "./IsometricCityViewport";
import { CityNodeIcon } from "./city-icons";
import {
  FrostedPopupWindow,
  type PopupRect,
} from "./FrostedPopupWindow";
import { localeNumber } from "@/lib/format";

const THEME_STORAGE_KEY = "neeleh-admin-theme";

type AdminThemeMode = "city" | "classic";
type ViewMode = "overview" | "entering" | "inside";

function getDefaultPopupRect(): PopupRect {
  if (typeof window === "undefined") {
    return { x: 140, y: 82, width: 1120, height: 620 };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(1120, Math.max(460, vw - 56));
  const height = Math.min(680, Math.max(380, vh - 164));
  const x = Math.max(16, Math.round((vw - width) / 2));
  const y = Math.max(76, Math.round((vh - height) / 2) - 6);
  return { x, y, width, height };
}

export function DashboardCityShell({
  user,
  stats,
  children,
}: {
  user: DashboardUser;
  stats: DashboardStats;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, isRTL } = useLang();

  const visibleNodes = useMemo(
    () => filterNodesByRoles(user.roles),
    [user.roles]
  );

  const [themeMode, setThemeMode] = useState<AdminThemeMode>("city");
  const [isSoftwareGl, setIsSoftwareGl] = useState<boolean>(false);
  const [isoTilted, setIsoTilted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | CityGroup>("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const isRootDashboard = pathname === "/dashboard" || pathname === "/dashboard/";
  const matchedNode = useMemo(
    () => findNodeForPath(pathname, visibleNodes) ?? CITY_NODES[0],
    [pathname, visibleNodes]
  );

  // مدیریت پنجره‌های باز و مینیمم‌شده
  const [openTabs, setOpenTabs] = useState<string[]>(() =>
    isRootDashboard ? [] : [matchedNode.id]
  );
  const [minimizedMap, setMinimizedMap] = useState<Record<string, boolean>>({});
  const [maximizedMap, setMaximizedMap] = useState<Record<string, boolean>>({});
  const [rectsMap, setRectsMap] = useState<Record<string, PopupRect>>({});

  const [viewMode, setViewMode] = useState<ViewMode>(
    isRootDashboard ? "overview" : "inside"
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(
    isRootDashboard ? null : matchedNode.id
  );

  const [hydrated, setHydrated] = useState(false);

  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const explicitExitRef = useRef(false);
  const enteringNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "classic" || saved === "city") {
        setThemeMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // همگام‌سازی تغییر مسیر با پنجره فعال (بدون قطع کردن پرواز نرم دوربین حین ورود به ساختمان)
  useEffect(() => {
    if (explicitExitRef.current && isRootDashboard) {
      explicitExitRef.current = false;
      enteringNodeIdRef.current = null;
      setViewMode("overview");
      setActiveNodeId(null);
      return;
    }

    if (!isRootDashboard) {
      const id = matchedNode.id;
      if (enteringNodeIdRef.current === id) {
        return;
      }
      setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setMinimizedMap((prev) => ({ ...prev, [id]: false }));
      setActiveNodeId(id);
      setViewMode("inside");
    }
  }, [pathname, isRootDashboard, matchedNode.id]);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  function switchTheme(next: AdminThemeMode) {
    setThemeMode(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  function handleSelectBuilding(node: CityNode) {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    explicitExitRef.current = false;
    enteringNodeIdRef.current = node.id;
    setHoveredNodeId(null);
    setActiveNodeId(node.id);
    setViewMode("entering");
    setOpenTabs((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
    setMinimizedMap((prev) => ({ ...prev, [node.id]: false }));

    const alreadyAtTarget =
      node.href === "/dashboard"
        ? pathname === "/dashboard" || pathname === "/dashboard/"
        : pathname === node.href;

    if (!alreadyAtTarget) {
      router.push(node.href);
    }

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallbackMs = reducedMotion ? 120 : 1500;

    enterTimerRef.current = setTimeout(() => {
      enteringNodeIdRef.current = null;
      setViewMode("inside");
    }, fallbackMs);
  }

  const handleEnterFlightComplete = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    enteringNodeIdRef.current = null;
    setViewMode((prev) => (prev === "entering" ? "inside" : prev));
  }, []);

  function handleMinimizeActive() {
    if (!activeNodeId) return;
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enteringNodeIdRef.current = null;
    setMinimizedMap((prev) => ({ ...prev, [activeNodeId]: true }));
    setViewMode("overview");
  }

  function handleRestoreTab(node: CityNode) {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    explicitExitRef.current = false;
    enteringNodeIdRef.current = null;
    setMinimizedMap((prev) => ({ ...prev, [node.id]: false }));
    setActiveNodeId(node.id);
    setViewMode("inside");

    const alreadyAtTarget =
      node.href === "/dashboard"
        ? pathname === "/dashboard" || pathname === "/dashboard/"
        : pathname === node.href;
    if (!alreadyAtTarget) {
      router.push(node.href);
    }
  }

  function handleCloseTab(nodeId: string) {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enteringNodeIdRef.current = null;
    setOpenTabs((prev) => prev.filter((id) => id !== nodeId));
    setMinimizedMap((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });

    if (activeNodeId === nodeId) {
      explicitExitRef.current = true;
      setViewMode("overview");
      setActiveNodeId(null);
      if (!isRootDashboard) {
        router.push("/dashboard");
      }
    }
  }

  const updateActiveRect = useCallback(
    (nextRect: PopupRect) => {
      if (!activeNodeId) return;
      setRectsMap((prev) => ({ ...prev, [activeNodeId]: nextRect }));
    },
    [activeNodeId]
  );

  async function logout() {
    await fetch("/api/auth/logout/", { method: "POST" });
    router.push("/login/");
    router.refresh();
  }

  const singleSearchMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const matches = visibleNodes.filter((node) => {
      const matchesGroup = groupFilter === "all" || node.group === groupFilter;
      if (!matchesGroup) return false;
      return (
        node.label.toLowerCase().includes(q) ||
        node.labelEn.toLowerCase().includes(q) ||
        node.districtFa.toLowerCase().includes(q) ||
        node.districtEn.toLowerCase().includes(q)
      );
    });
    return matches.length === 1 ? matches[0] : null;
  }, [searchQuery, groupFilter, visibleNodes]);

  // ── Classic Grayscale Theme Fallback ──────────────────────────────────────
  if (themeMode === "classic") {
    return (
      <div className="dashboard-scene flex min-h-[100svh] bg-background">
        <DashboardSidebar user={user} />
        <main className="flex-1 min-w-0 relative">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={() => switchTheme("city")}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-secondary transition-colors"
              >
                <MapIcon className="size-3.5" />
                <span>
                  {lang === "fa"
                    ? "ورود به نقشه شهر اسکیس"
                    : "Switch to Vector Sketch City"}
                </span>
              </button>
            </div>
            {children}
          </div>
        </main>
      </div>
    );
  }

  // ── Vector Sketch City + Frosted Glass Floating Windows ──────────────────
  const activeBuilding = activeNodeId
    ? visibleNodes.find((n) => n.id === activeNodeId) ?? matchedNode
    : null;
  const isPopupVisible =
    viewMode === "inside" &&
    activeBuilding !== null &&
    !minimizedMap[activeBuilding.id];

  // وقتی پنجره مینیمم است یا بسته، شهر در حالت نمای کلی و قابل کلیک است
  const viewportMode: ViewMode = isPopupVisible ? "inside" : viewMode === "entering" ? "entering" : "overview";

  const hoveredBuilding = hoveredNodeId
    ? visibleNodes.find((n) => n.id === hoveredNodeId) ?? null
    : null;

  const groupOptions: Array<{ id: "all" | CityGroup; fa: string; en: string }> = [
    { id: "all", fa: "کل شهر", en: "All" },
    { id: "main", fa: "هسته", en: "Core" },
    { id: "content", fa: "محتوا", en: "Content" },
    { id: "system", fa: "سیستم", en: "System" },
  ];

  const userName = lang === "en" ? user.nameEn || user.name : user.name;
  const currentRect =
    (activeBuilding && rectsMap[activeBuilding.id]) ||
    (hydrated ? getDefaultPopupRect() : { x: 140, y: 82, width: 1120, height: 620 });

  return (
    <div className="dashboard-city-theme relative min-h-[100svh] w-full overflow-hidden">
      {/* لایه ثابت ۳بعدی نقشه اسکیس برداری شهر */}
      <div className="fixed inset-0 z-0">
        <IsometricCityViewport
          nodes={visibleNodes}
          activeNodeId={activeNodeId}
          viewMode={viewportMode}
          hoveredNodeId={hoveredNodeId}
          onHoverNode={setHoveredNodeId}
          onSelectNode={handleSelectBuilding}
          onSoftwareGlChange={setIsSoftwareGl}
          stats={stats}
          lang={lang}
          searchQuery={searchQuery}
          activeGroupFilter={groupFilter}
          searchFocusNode={singleSearchMatch}
          onEnterFlightComplete={handleEnterFlightComplete}
          resetSignal={resetSignal}
        />
      </div>

      {/* هدر ثابت بالای نقشه شهر */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 p-3 sm:p-4">
        <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* برند و کاربر */}
          <div className="city-glass-pill flex items-center gap-2.5 px-3 py-1.5">
            <span className="grid size-7 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
              ن
            </span>
            <div className="pe-1">
              <div className="text-xs font-semibold leading-tight text-slate-900">
                {lang === "fa" ? "شهر اسکیس نیله" : "Neeleh Sketch City"}
              </div>
              <div className="text-[10px] text-slate-600 truncate max-w-[130px]">
                {userName}
              </div>
            </div>
          </div>

          {/* جستجو و فیلتر مناطق */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="city-glass-pill flex items-center gap-2 px-3 py-1.5">
              <Search className="size-3.5 text-slate-600 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === "fa" ? "جستجوی ساختمان..." : "Search buildings..."
                }
                aria-label={lang === "fa" ? "جستجوی ساختمان" : "Search buildings"}
                className="!bg-transparent !border-0 !shadow-none !p-0 text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none w-32 sm:w-44"
              />
            </div>

            <div
              className="city-glass-pill hidden md:flex items-center p-0.5 gap-0.5"
              role="tablist"
              aria-label={lang === "fa" ? "مناطق شهر" : "City districts"}
            >
              {groupOptions.map((g) => {
                const isActive = groupFilter === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setGroupFilter(g.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "city-blue-pill"
                        : "text-slate-700 hover:text-slate-950"
                    }`}
                  >
                    {lang === "fa" ? g.fa : g.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ابزارهای دوربین، زبان، سایت و تم */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setResetSignal((s) => s + 1)}
              title={lang === "fa" ? "بازنشانی زاویه دوربین" : "Reset camera"}
              aria-label={lang === "fa" ? "بازنشانی دوربین" : "Reset camera"}
              className="city-glass-pill flex size-8 items-center justify-center text-slate-800"
            >
              <RotateCcw className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === "fa" ? "en" : "fa")}
              className="city-glass-pill px-2.5 py-1.5 text-xs font-semibold text-slate-800"
            >
              {lang === "fa" ? "EN" : "FA"}
            </button>

            <Link
              href="/?inspector=1"
              className="city-blue-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
              title={lang === "fa" ? "ورود به سایت با بازرس صحنه و پنل همراه" : "Open live site with Scene Inspector"}
            >
              <Crosshair className="size-3.5" />
              <span>{lang === "fa" ? "بازرس صحنه" : "Inspector"}</span>
            </Link>

            <Link
              href="/"
              className="city-glass-pill hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <ExternalLink className="size-3.5" />
              <span>{lang === "fa" ? "سایت" : "Site"}</span>
            </Link>

            <button
              type="button"
              onClick={() => switchTheme("classic")}
              className="city-glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <Layers className="size-3.5" />
              <span className="hidden sm:inline">
                {lang === "fa" ? "کلاسیک" : "Classic"}
              </span>
            </button>

            <button
              type="button"
              onClick={logout}
              aria-label={lang === "fa" ? "خروج" : "Logout"}
              title={lang === "fa" ? "خروج" : "Logout"}
              className="city-glass-pill flex size-8 items-center justify-center text-slate-800"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </header>
      </div>

      {/* کارت اطلاعات ساختمان هاور شده در نمای شهر */}
      {viewportMode === "overview" && hoveredBuilding && (
        <div className="pointer-events-none fixed bottom-20 inset-x-4 sm:inset-x-6 z-20 flex justify-start pl-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={hoveredBuilding.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className={`pointer-events-auto city-frosted-card w-full sm:w-72 rounded-[20px] p-3.5 ${
                isSoftwareGl ? "city-frosted-fallback" : "city-frosted-blur"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <CityNodeIcon
                    iconKey={hoveredBuilding.iconKey}
                    className="size-4"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-slate-500">
                    {lang === "fa"
                      ? hoveredBuilding.districtFa
                      : hoveredBuilding.districtEn}
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {lang === "fa"
                      ? hoveredBuilding.label
                      : hoveredBuilding.labelEn}
                  </div>
                </div>
                {stats && hoveredBuilding.statKey && (
                  <span className="rounded-full bg-blue-500/12 px-2.5 py-0.5 text-xs font-bold text-blue-700 tabular-nums">
                    {localeNumber(lang, stats[hoveredBuilding.statKey])}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSelectBuilding(hoveredBuilding)}
                className="city-blue-pill mt-3 w-full py-1.5 text-xs font-semibold"
              >
                {lang === "fa" ? "باز کردن پنجره" : "Open Window"}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* پنجره پاپ‌آپ شیشه‌ای مات (قابل جابجایی، مینیمم، ماکسیمایز و تغییر اندازه) */}
      <AnimatePresence>
        {isPopupVisible && activeBuilding && (
          <FrostedPopupWindow
            key={activeBuilding.id}
            node={activeBuilding}
            lang={lang}
            isRTL={isRTL}
            isSoftwareGl={isSoftwareGl}
            maximized={Boolean(maximizedMap[activeBuilding.id])}
            isoTilted={isoTilted}
            rect={currentRect}
            onChangeRect={updateActiveRect}
            onToggleIso={setIsoTilted}
            onMinimize={handleMinimizeActive}
            onToggleMaximize={() =>
              setMaximizedMap((prev) => ({
                ...prev,
                [activeBuilding.id]: !prev[activeBuilding.id],
              }))
            }
            onClose={() => handleCloseTab(activeBuilding.id)}
          >
            {children}
          </FrostedPopupWindow>
        )}
      </AnimatePresence>

      {/* تسک‌بار پایین برای پنجره‌های باز / مینیمم‌شده و دسترسی سریع */}
      <div className="pointer-events-none fixed bottom-3 inset-x-0 z-40 flex justify-center px-4 pl-14">
        <div
          className={`pointer-events-auto city-taskbar flex items-center gap-1.5 rounded-full px-2.5 py-1.5 max-w-full overflow-x-auto ${
            isSoftwareGl ? "city-frosted-fallback" : "city-frosted-blur"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (activeNodeId && !minimizedMap[activeNodeId]) {
                handleMinimizeActive();
              } else {
                setViewMode("overview");
              }
            }}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              !isPopupVisible
                ? "city-blue-pill"
                : "text-slate-700 hover:bg-white/70"
            }`}
          >
            <Compass className="size-3.5" />
            <span>{lang === "fa" ? "نمای شهر" : "City"}</span>
          </button>

          {openTabs.length > 0 && (
            <span className="h-4 w-px bg-slate-400/40 mx-0.5 shrink-0" />
          )}

          {/* پنجره‌های باز یا مینیمم‌شده در تسک‌بار */}
          {openTabs.map((tabId) => {
            const tabNode = visibleNodes.find((n) => n.id === tabId);
            if (!tabNode) return null;
            const isCurrent = isPopupVisible && activeBuilding?.id === tabId;
            const isMin = Boolean(minimizedMap[tabId]);
            return (
              <div
                key={tabId}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full ps-2.5 pe-1.5 py-1 text-xs font-medium transition-all ${
                  isCurrent
                    ? "city-blue-pill"
                    : "bg-white/65 text-slate-800 border border-slate-300/60 hover:bg-white/90"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    isCurrent ? handleMinimizeActive() : handleRestoreTab(tabNode)
                  }
                  className="inline-flex items-center gap-1.5"
                >
                  <CityNodeIcon iconKey={tabNode.iconKey} className="size-3.5" />
                  <span className="whitespace-nowrap">
                    {lang === "fa" ? tabNode.label : tabNode.labelEn}
                  </span>
                  {isMin && (
                    <span className="size-1.5 rounded-full bg-blue-500" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCloseTab(tabId)}
                  aria-label={lang === "fa" ? "بستن تب" : "Close tab"}
                  className={`grid size-4 place-items-center rounded-full transition-colors ${
                    isCurrent
                      ? "hover:bg-white/25 text-white"
                      : "hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  <X className="size-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
