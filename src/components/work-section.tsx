"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { SplitText } from "./split-text";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { COURSE_ID_TO_SLUG } from "@/lib/domain/academy-rules";
import { BlockReveal } from "@/components/block-reveal";
import {
  CourseSoftwareArtwork,
  type PointerOffset,
} from "@/components/course-software-svg";

type Project = {
  id: string;
  slug: string;
  tier: 1 | 2 | 3;
  title: string;
  description: string;
  discipline: string;
};

function useProjects(): Project[] {
  const { t } = useLang();
  return t.courses.map((c) => ({
    id: c.id,
    slug: COURSE_ID_TO_SLUG[c.id] ?? "autocad-phase2",
    tier: c.tier as 1 | 2 | 3,
    title: c.title,
    description: c.description,
    discipline: c.discipline,
  }));
}

export function WorkSection() {
  const { lang, t, isRTL } = useLang();
  const fa = lang === "fa";
  const allProjects = useProjects();

  const [tierFilter, setTierFilter] = useState<0 | 1 | 2 | 3>(0);
  const [activeId, setActiveId] = useState<string>(allProjects[0]?.id ?? "01");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<PointerOffset>({ x: 0, y: 0 });

  const projects =
    tierFilter === 0
      ? allProjects
      : allProjects.filter((p) => p.tier === tierFilter);

  const previewProject =
    projects.find((p) => p.id === (hoveredId ?? activeId)) ??
    projects[0] ??
    allProjects[0];

  function handleSectionMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
    setPointer({ x: nx, y: ny });
  }

  return (
    <section
      id="work"
      onMouseMove={handleSectionMouseMove}
      className="relative py-20 sm:py-28 border-t border-border"
    >
      <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12">
        {/* Clean editorial heading */}
        <BlockReveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-14">
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground tabular-nums">
              {t.work.selectedWork}
            </div>
            <div className="mask-reveal">
              <SplitText
                as="h2"
                text={`${t.work.years[0]} · ${t.work.word} · ${t.work.years[1]}`}
                mode="words"
                stagger={0.05}
                duration={0.7}
                className={`font-medium ${
                  fa
                    ? "text-3xl sm:text-5xl lg:text-6xl leading-[1.25]"
                    : "text-4xl sm:text-6xl lg:text-7xl tracking-[-0.04em] leading-[1]"
                }`}
              />
            </div>
          </div>

          {/* Interactive tier filter controls */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-secondary/70 rounded-lg border border-border w-fit">
            {[
              { val: 0 as const, label: fa ? "همه دوره‌ها" : "All Courses" },
              { val: 1 as const, label: t.awards.titles.tier1 },
              { val: 2 as const, label: t.awards.titles.tier2 },
              { val: 3 as const, label: t.awards.titles.tier3 },
            ].map((tab) => {
              const active = tierFilter === tab.val;
              return (
                <button
                  key={tab.val}
                  type="button"
                  onClick={() => {
                    setTierFilter(tab.val);
                    const nextList =
                      tab.val === 0
                        ? allProjects
                        : allProjects.filter((p) => p.tier === tab.val);
                    if (nextList[0]) setActiveId(nextList[0].id);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </BlockReveal>

        {/* Two-column layout: Scannable course rows + Sticky Creative Software SVG Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Course title rows */}
          <ul className="lg:col-span-7 border-t border-border">
            {projects.map((p) => {
              const isSelected = previewProject?.id === p.id;
              return (
                <li
                  key={p.id}
                  onMouseEnter={() => {
                    setHoveredId(p.id);
                    setActiveId(p.id);
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  className="border-b border-border transition-colors"
                >
                  <Link
                    href={`/courses/${p.slug}`}
                    onFocus={() => setActiveId(p.id)}
                    className={`group grid grid-cols-12 gap-3 sm:gap-4 items-center py-5 sm:py-6 transition-colors ${
                      isSelected ? "bg-secondary/45 px-3 -mx-3 rounded-md" : ""
                    }`}
                  >
                    {/* Index */}
                    <div className="col-span-2 sm:col-span-1 text-xs font-mono text-muted-foreground tabular-nums">
                      {fa ? toFaDigits(p.id) : p.id}
                    </div>

                    {/* Title + unboxed clean metadata */}
                    <div className="col-span-10 sm:col-span-8 min-w-0">
                      <h3
                        className={`font-medium transition-colors ${
                          fa
                            ? "text-lg sm:text-xl leading-[1.45]"
                            : "text-xl sm:text-2xl tracking-tight leading-[1.2]"
                        } ${isSelected ? "text-foreground" : "text-foreground/85 group-hover:text-foreground"}`}
                      >
                        {p.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                        <span>{t.awards.titles[`tier${p.tier}`]}</span>
                        <span aria-hidden>·</span>
                        <span>{t.work.disciplines[p.discipline] ?? p.discipline}</span>
                      </div>
                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>

                      {/* Mobile inline software preview on active selection */}
                      {isSelected && (
                        <div className="mt-4 lg:hidden rounded-md border border-border bg-card p-3">
                          <div className="h-36 w-full">
                            <CourseSoftwareArtwork
                              slugOrKey={p.slug}
                              externalPointer={pointer}
                              className="h-full w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Direct course link arrow */}
                    <div className="hidden sm:flex sm:col-span-3 items-center justify-end gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      <span className="whitespace-nowrap">
                        {fa ? "مشاهده دوره" : "View course"}
                      </span>
                      <ArrowUpRight
                        className={`size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                          isRTL ? "-scale-x-100 group-hover:-translate-x-0.5" : ""
                        }`}
                        aria-hidden
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop sticky creative hover reveal stage */}
          {previewProject && (
            <aside className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24">
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    {fa ? toFaDigits(previewProject.id) : previewProject.id} /{" "}
                    {t.work.disciplines[previewProject.discipline] ?? previewProject.discipline}
                  </span>
                  <span>{t.awards.titles[`tier${previewProject.tier}`]}</span>
                </div>

                {/* Animated Mouse-Reactive Software Line-Art Viewport */}
                <div className="relative h-64 sm:h-72 bg-secondary/25 px-6 py-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={previewProject.slug}
                      initial={{ opacity: 0, scale: 0.96, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full h-full"
                    >
                      <CourseSoftwareArtwork
                        slugOrKey={previewProject.slug}
                        externalPointer={pointer}
                        className="w-full h-full"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="p-5 border-t border-border space-y-3">
                  <div className="text-base font-medium leading-snug">
                    {previewProject.title}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {previewProject.description}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <Link
                      href={`/courses/${previewProject.slug}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-foreground link-underline"
                    >
                      <span>{fa ? "صفحه کامل و ثبت‌نام" : "Syllabus & registration"}</span>
                      <ArrowUpRight className={`size-3.5 ${isRTL ? "-scale-x-100" : ""}`} aria-hidden />
                    </Link>
                    <Link
                      href="/courses"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t.work.allWorks}
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
