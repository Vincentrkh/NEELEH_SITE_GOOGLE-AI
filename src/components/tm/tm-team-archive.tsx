"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmCursor } from "@/components/tm/tm-effects";
import { TmScrollProgress } from "@/components/tm/tm-sections";
import { TmInstructorPortraitSvg } from "@/components/tm/tm-svg-art";

/* ═══════════════════════════════════════════════════════════════════════════
   TmTeamArchive — 1:1 Match of https://www.tresmarescapital.com/en/team/
   (Rec_0004_9ffd2644.mp4 02:07..02:11)
   ═══════════════════════════════════════════════════════════════════════════ */

export type TmPerson = {
  id: string;
  name: string;
  bio: string | null;
  field: string | null;
  education: string | null;
  avatarUrl: string | null;
  courseCount: number;
};

const PAGE_SIZE = 8;

export function TmTeamArchive({ people }: { people: TmPerson[] }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [field, setField] = React.useState("");
  const [page, setPage] = React.useState(0);

  const fields = React.useMemo(
    () => Array.from(new Set(people.map((p) => p.field).filter(Boolean))) as string[],
    [people],
  );

  const filtered = React.useMemo(
    () => people.filter((p) => !field || p.field === field),
    [people, field],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="tm-root" style={{ background: "#fff", color: "#2b2b2b" }}>
      <TmCursor />
      <TmScrollProgress />
      <TmHeader />
      <main>
        <section className="tm-archive-hero" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-archive-hero__intro">
            <p>
              {fa
                ? "مدرس‌های نیله هم می‌سازند و هم تدریس می‌کنند — تجربه‌ی واقعی دفاتر و کارگاه مستقیم به کلاس می‌آید."
                : "Our faculty of practicing architects and BIM directors brings decades of execution expertise into studio training."}
            </p>
          </div>
          <h1 className="tm-archive-hero__title">
            {fa ? (
              <>
                مدرسین
                <br />
                آکادمی نیله
              </>
            ) : (
              <>
                Behind
                <br />
                Neeleh
              </>
            )}
          </h1>
        </section>

        <section className="tm-archive tm-archive--edge" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-archive__filters tm-archive__filters--inline">
            <span className="tm-archive__filter-kicker">{fa ? "فیلتر:" : "Filter by"}</span>
            <label className="tm-inline-select">
              <select
                value={field}
                aria-label={fa ? "تخصص" : "Specialization"}
                onChange={(e) => {
                  setField(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">{fa ? "تخصص" : "Specialty"}</option>
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5" strokeWidth={1.6} aria-hidden="true" />
            </label>

            {field && (
              <button
                type="button"
                className="tm-link"
                onClick={() => {
                  setField("");
                  setPage(0);
                }}
              >
                {fa ? "حذف فیلتر" : "Reset"}
              </button>
            )}

            <span className="tm-archive__count" aria-live="polite">
              {fa
                ? `${toFaDigits(String(filtered.length))} مدرس`
                : `${filtered.length} mentors`}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="tm-archive__empty">
              <p>{fa ? "مدرسی با این فیلتر پیدا نشد." : "No instructors match this filter."}</p>
            </div>
          ) : (
            <div className="tm-archive__grid tm-archive__grid--people">
              {visible.map((p, i) => (
                <Link
                  href={`/instructors/${p.id}`}
                  key={p.id}
                  className="tm-teamcard"
                  data-cursor-view={fa ? "پروفایل" : "View"}
                >
                  <div className="tm-teamcard__photo">
                    <TmInstructorPortraitSvg name={p.name} index={page * PAGE_SIZE + i} />
                  </div>
                  <div className="tm-teamcard__meta">
                    <div className="tm-teamcard__role">
                      {p.field ?? (fa ? "مدرس معماری" : "Studio Instructor")}
                    </div>
                    <h3 className="tm-teamcard__name">{p.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav className="tm-archive__pager" aria-label={fa ? "صفحه‌بندی" : "Pagination"}>
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  data-active={i === page}
                  aria-current={i === page ? "page" : undefined}
                  onClick={() => setPage(i)}
                >
                  {fa ? toFaDigits(String(i + 1)) : i + 1}
                </button>
              ))}
            </nav>
          )}
        </section>
      </main>
      <TmFooter />
    </div>
  );
}
