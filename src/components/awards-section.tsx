"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { SplitText } from "./split-text";
import { useLang } from "./language-provider";
import { toFaDigits } from "@/lib/i18n";
import { COURSE_ID_TO_SLUG } from "@/lib/domain/academy-rules";
import { CourseSoftwareArtwork } from "./course-software-svg";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

type CourseRow = {
  id: string;
  slug: string;
  tier: 1 | 2 | 3;
  title: string;
  description: string;
  discipline: string;
  syllabus: string[];
};

function useCourses(): CourseRow[] {
  const { t } = useLang();
  return t.courses.map((c) => ({
    id: c.id,
    slug: COURSE_ID_TO_SLUG[c.id] ?? "autocad-phase2",
    tier: c.tier as 1 | 2 | 3,
    title: c.title,
    description: c.description,
    discipline: c.discipline,
    syllabus: c.syllabus,
  }));
}

export function AwardsSection() {
  const { t, isRTL, lang } = useLang();
  const courses = useCourses();

  return (
    <section
      id="awards"
      className="relative py-20 sm:py-32 border-t border-border overflow-hidden"
    >
      <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12">
        {/* Heading */}
        <div className="grid grid-cols-12 gap-6 mb-12 sm:mb-16 items-end">
          <div className="col-span-12 md:col-span-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {lang === "fa" ? "۰۲" : "02"}
              </span>
              <span aria-hidden>·</span>
              <span>{t.awards.label}</span>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="flex flex-wrap items-end gap-x-3 sm:gap-x-6 gap-y-2">
              {t.awards.heading.map((word, i) => (
                <HeadingWord
                  key={`${word}-${i}`}
                  text={word}
                  delay={i * 0.08}
                  muted={i > 0}
                />
              ))}
            </div>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
              {t.awards.sub}
            </p>
          </div>
        </div>

        {/* Table header row (md+) */}
        <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border pb-3 text-xs text-muted-foreground">
          <div className="col-span-1">{isRTL ? "کد" : "Code"}</div>
          <div className="col-span-5">{isRTL ? "دوره و ابزار" : "Course & Software"}</div>
          <div className="col-span-2">{isRTL ? "سطح" : "Tier"}</div>
          <div className="col-span-4">{t.awards.syllabusLabel}</div>
        </div>

        {/* Course rows */}
        <div className="border-t md:border-t-0 border-border divide-y divide-border">
          {courses.map((c, i) => (
            <CourseRowCard key={c.id} course={c} index={i} />
          ))}
        </div>
      </div>

      {/* Marquee ticker */}
      <div className="mt-16 sm:mt-24 overflow-hidden border-y border-border py-5 sm:py-6 bg-foreground/[0.02]">
        <Marquee>
          {t.awards.marquee.map((item, i) => (
            <span
              key={i}
              className={`flex items-center gap-8 sm:gap-12 text-2xl sm:text-4xl whitespace-nowrap px-6 sm:px-10 ${
                isRTL ? "fa-serif" : "font-serif-display italic"
              }`}
            >
              {item}
              <span className="text-xl text-muted-foreground" aria-hidden>
                ·
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function HeadingWord({
  text,
  delay,
  muted,
}: {
  text: string;
  delay: number;
  muted?: boolean;
}) {
  return (
    <div className="mask-reveal">
      <SplitText
        as="h2"
        text={text}
        mode="chars"
        stagger={0.035}
        duration={0.65}
        delay={delay}
        className={`text-3xl sm:text-5xl md:text-6xl font-medium tracking-[-0.03em] leading-[1.05] ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      />
    </div>
  );
}

function CourseRowCard({ course, index }: { course: CourseRow; index: number }) {
  const { lang, t, isRTL } = useLang();
  const [open, setOpen] = useState(index === 0);
  const reduced = useSafeReducedMotion();

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.03, 0.2),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full grid grid-cols-12 gap-4 items-center py-4 sm:py-5 hover:bg-foreground/[0.02] transition-colors text-start min-h-[68px]"
      >
        {/* Index */}
        <div className="col-span-2 md:col-span-1 text-sm font-mono text-muted-foreground tabular-nums">
          {lang === "fa" ? toFaDigits(course.id) : course.id}
        </div>

        {/* Artwork + Title */}
        <div className="col-span-10 md:col-span-5 flex items-center gap-3.5 min-w-0">
          <div className="hidden sm:block w-16 h-11 shrink-0 rounded border border-border/70 bg-secondary/20 p-1">
            <CourseSoftwareArtwork slugOrKey={course.slug} compact className="w-full h-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-medium tracking-tight leading-snug text-foreground">
              <bdi>{course.title}</bdi>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground md:hidden">
              <span>{t.awards.titles[`tier${course.tier}`]}</span>
              <span aria-hidden>·</span>
              <span>{t.work.disciplines[course.discipline] ?? course.discipline}</span>
            </div>
          </div>
        </div>

        {/* Tier & discipline — clean unboxed text */}
        <div className="hidden md:flex md:col-span-2 items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t.awards.titles[`tier${course.tier}`]}</span>
        </div>

        {/* Syllabus summary + toggle chevron */}
        <div className="hidden md:flex md:col-span-4 items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground truncate">
            {course.syllabus[0]}
            {course.syllabus.length > 1 &&
              ` (+${localeMoreCount(lang, course.syllabus.length - 1)})`}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180 text-foreground" : ""
            }`}
            aria-hidden
          />
        </div>
      </button>

      {open && (
        <div className="pb-6 pt-1 md:grid md:grid-cols-12 md:gap-4">
          <div className="hidden md:block md:col-span-1" />
          <div className="md:col-span-11 grid lg:grid-cols-[200px_1fr] gap-6 items-start rounded-lg border border-border/80 bg-secondary/20 p-4 sm:p-5">
            <div className="w-full max-w-[220px] aspect-[16/11] rounded border border-border bg-card p-2">
              <CourseSoftwareArtwork slugOrKey={course.slug} className="w-full h-full" />
            </div>
            <div>
              <p className="text-sm leading-relaxed text-foreground/85 max-w-2xl mb-4">
                {course.description}
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm leading-relaxed text-muted-foreground mb-5">
                {course.syllabus.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 size-1 rounded-full bg-foreground/50 shrink-0" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/70">
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <span>{isRTL ? "مشاهده صفحه دوره و ثبت‌نام" : "View course & syllabus"}</span>
                  <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                </Link>
                <span className="text-xs text-muted-foreground">
                  {t.work.disciplines[course.discipline] ?? course.discipline}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function localeMoreCount(lang: "en" | "fa", count: number): string {
  return lang === "fa" ? `${toFaDigits(count)} سرفصل دیگر` : `${count} more modules`;
}

function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 animate-marquee"
      style={{ "--duration": "55s" } as React.CSSProperties}
    >
      <div className="flex shrink-0">{children}</div>
      <div className="flex shrink-0" aria-hidden>
        {children}
      </div>
    </div>
  );
}
