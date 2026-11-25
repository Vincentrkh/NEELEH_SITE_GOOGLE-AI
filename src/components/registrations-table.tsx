"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import {
  localeNumber,
  localeDate,
  localeDateTime,
  localePrice,
  regLabel,
  paymentLabel,
  tierLabel,
} from "@/lib/format";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  listPresentSocials,
  type SocialPlatform,
} from "@/lib/socials";
import { type GanttData, formatSessionLabel } from "@/lib/attendance-gantt";
import { AttendanceGantt } from "@/components/attendance-gantt";
import { type MessageChannel, type MessengerDispatchLink } from "@/lib/messaging";
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  Filter,
  Phone,
  Mail,
  FileText,
  Send,
  MessageSquare,
  CalendarDays,
  RotateCcw,
  ExternalLink,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Clock,
  Users,
} from "lucide-react";

export type EnrichedRegistration = {
  id: string;
  trackingCode: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  paymentStatus: "PAID" | "UNPAID";
  note: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    nameEn: string | null;
    phone: string;
    email: string | null;
    field: string | null;
    education: string | null;
    telegram: string | null;
    whatsapp: string | null;
    eitaa: string | null;
    bale: string | null;
    instagram: string | null;
    linkedin: string | null;
  };
  course: {
    id: string;
    title: string;
    titleEn: string | null;
    slug: string;
    price: number;
    tier: string;
    durationHrs: number;
  };
  gantt: GanttData | null;
};

export type CourseFilterOption = {
  id: string;
  title: string;
  titleEn: string | null;
};

export type SentMessageRecipient = {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  readAt: string | null;
  emailStatus: string | null;
  emailError: string | null;
  messengerStatus: string | null;
  messengerTarget: string | null;
  links: MessengerDispatchLink[];
};

export type SentMessageRecord = {
  id: string;
  title: string;
  body: string;
  channels: MessageChannel[];
  isBroadcast: boolean;
  course: { id: string; title: string; titleEn: string | null } | null;
  senderName: string | null;
  createdAt: string;
  totalRecipients: number;
  readCount: number;
  emailSentCount: number;
  recipients: SentMessageRecipient[];
};

type TabKey = "registrations" | "leaves" | "messages";

type ComposerTarget =
  | { kind: "selected"; ids: string[] }
  | { kind: "single"; regId: string; studentName: string }
  | { kind: "cohort"; courseId: string; statusFilter: string };

export function RegistrationsTable({
  initialRegistrations,
  courses,
  initialMessages,
  capabilities,
  canUpdate,
  canDelete,
  canExport,
}: {
  initialRegistrations: EnrichedRegistration[];
  courses: CourseFilterOption[];
  initialMessages: SentMessageRecord[];
  capabilities: { smtpConfigured: boolean; telegramBotConfigured: boolean };
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>("registrations");
  const [registrations, setRegistrations] =
    useState<EnrichedRegistration[]>(initialRegistrations);
  const [messages, setMessages] = useState<SentMessageRecord[]>(initialMessages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // Filters & selection
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [socialFilter, setSocialFilter] = useState<"" | SocialPlatform>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Composer drawer/modal state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTarget, setComposerTarget] = useState<ComposerTarget>({
    kind: "cohort",
    courseId: "",
    statusFilter: "CONFIRMED",
  });
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgChannels, setMsgChannels] = useState<MessageChannel[]>(["CARTABLE", "TELEGRAM"]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [lastDispatch, setLastDispatch] = useState<SentMessageRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (courseFilter && r.course.id !== courseFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (paymentFilter && r.paymentStatus !== paymentFilter) return false;
      if (socialFilter && !r.student[socialFilter]?.trim()) return false;
      if (q) {
        const socials = listPresentSocials(r.student)
          .map((s) => s.value.toLowerCase())
          .join(" ");
        const hay = [
          r.student.name,
          r.student.nameEn ?? "",
          r.student.phone,
          r.student.email ?? "",
          r.trackingCode ?? "",
          r.course.title,
          r.course.titleEn ?? "",
          socials,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [registrations, search, courseFilter, statusFilter, paymentFilter, socialFilter]);

  const declaredLeaveItems = useMemo(() => {
    const items: Array<{
      reg: EnrichedRegistration;
      dateKey: string;
      sessionIndex: number | null;
      jalaliFull: string;
      gregorianFull: string;
      studentNote: string | null;
      declaredAt: string | null;
    }> = [];
    for (const reg of registrations) {
      if (!reg.gantt) continue;
      for (const day of reg.gantt.scheduledDays) {
        if (day.status === "DECLARED_ABSENCE") {
          items.push({
            reg,
            dateKey: day.dateKey,
            sessionIndex: day.sessionIndex,
            jalaliFull: day.jalaliFull,
            gregorianFull: day.gregorianFull,
            studentNote: day.studentNote,
            declaredAt: day.declaredAt,
          });
        }
      }
    }
    return items.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [registrations]);

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      pending: registrations.filter((r) => r.status === "PENDING").length,
      confirmed: registrations.filter((r) => r.status === "CONFIRMED").length,
      paid: registrations.filter((r) => r.paymentStatus === "PAID").length,
      revenue: registrations
        .filter((r) => r.paymentStatus === "PAID")
        .reduce((sum, r) => sum + r.course.price, 0),
      declaredLeaves: declaredLeaveItems.length,
    };
  }, [registrations, declaredLeaveItems.length]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((f) => f.id === id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((f) => f.id)])));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function updateReg(
    id: string,
    patch: { status?: string; paymentStatus?: string; note?: string },
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as {
        error?: string;
        registration?: Partial<EnrichedRegistration>;
      };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      // Re-fetch Gantt when confirmed so progress matrix is fresh
      let freshGantt: GanttData | null | undefined = undefined;
      if (patch.status === "CONFIRMED") {
        const gRes = await fetch(`/api/dashboard/registrations/${id}/gantt/`);
        if (gRes.ok) {
          const gJson = (await gRes.json()) as { gantt?: GanttData };
          freshGantt = gJson.gantt ?? null;
        }
      }
      setRegistrations((list) =>
        list.map((r) =>
          r.id === id
            ? {
                ...r,
                ...(patch.status ? { status: patch.status as EnrichedRegistration["status"] } : {}),
                ...(patch.paymentStatus
                  ? { paymentStatus: patch.paymentStatus as EnrichedRegistration["paymentStatus"] }
                  : {}),
                ...(patch.note !== undefined ? { note: patch.note } : {}),
                ...(freshGantt !== undefined ? { gantt: freshGantt } : {}),
              }
            : r,
        ),
      );
      toast({ title: fa ? "به‌روزرسانی شد" : "Updated" });
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function bulkConfirmSelected() {
    if (selectedIds.length === 0) return;
    setBusyId("bulk");
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/dashboard/registrations/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONFIRMED" }),
          }),
        ),
      );
      setRegistrations((list) =>
        list.map((r) => (selectedIds.includes(r.id) ? { ...r, status: "CONFIRMED" } : r)),
      );
      toast({
        title: fa ? "تایید گروهی انجام شد" : "Bulk confirmation complete",
      });
      setSelectedIds([]);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReg(id: string) {
    if (
      !confirm(
        fa
          ? "این ثبت‌نام حذف شود؟ این عمل قابل بازگشت نیست."
          : "Delete this registration? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/registrations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      setRegistrations((list) => list.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast({ title: fa ? "ثبت‌نام حذف شد" : "Registration deleted" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeaveDecision(
    registrationId: string,
    dateKey: string,
    action: "CANCEL_LEAVE" | "MARK_ABSENT" | "MARK_PRESENT",
  ) {
    setBusyId(`${registrationId}:${dateKey}`);
    try {
      const res = await fetch(`/api/dashboard/registrations/${registrationId}/gantt/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dateKey }),
      });
      const data = (await res.json()) as { error?: string; gantt?: GanttData };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      if (data.gantt) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === registrationId ? { ...r, gantt: data.gantt! } : r)),
        );
      }
      toast({
        title:
          action === "CANCEL_LEAVE"
            ? fa
              ? "غیبت اعلام‌شده لغو شد"
              : "Declared absence cancelled"
            : fa
              ? "وضعیت ثبت شد"
              : "Status saved",
      });
    } finally {
      setBusyId(null);
    }
  }

  function openComposerForSingle(reg: EnrichedRegistration) {
    setComposerTarget({ kind: "single", regId: reg.id, studentName: reg.student.name });
    setLastDispatch(null);
    setComposerOpen(true);
  }

  function openComposerForSelected() {
    setComposerTarget({ kind: "selected", ids: selectedIds });
    setLastDispatch(null);
    setComposerOpen(true);
  }

  function openComposerForCohort() {
    setComposerTarget({
      kind: "cohort",
      courseId: courseFilter,
      statusFilter: statusFilter || "CONFIRMED",
    });
    setLastDispatch(null);
    setComposerOpen(true);
  }

  function toggleChannel(ch: MessageChannel) {
    if (ch === "CARTABLE") return; // Always delivered to Cartable
    setMsgChannels((prev) =>
      prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch],
    );
  }

  async function sendComposedMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgTitle.trim() || !msgBody.trim()) return;
    setSendingMsg(true);
    try {
      const payload: Record<string, unknown> = {
        title: msgTitle.trim(),
        body: msgBody.trim(),
        channels: msgChannels,
      };
      if (composerTarget.kind === "single") {
        payload.registrationIds = [composerTarget.regId];
      } else if (composerTarget.kind === "selected") {
        payload.registrationIds = composerTarget.ids;
        payload.isBroadcast = true;
      } else {
        payload.courseId = composerTarget.courseId || undefined;
        payload.statusFilter = composerTarget.statusFilter || undefined;
        payload.isBroadcast = true;
      }

      const res = await fetch("/api/dashboard/messages/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: SentMessageRecord;
      };
      if (!res.ok || !data.message) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      setLastDispatch(data.message);
      setMessages((prev) => [data.message!, ...prev]);
      setMsgTitle("");
      setMsgBody("");
      toast({
        title: fa ? "پیام به کارتابل ارسال شد" : "Message sent to Cartable",
        description: fa
          ? `${localeNumber(lang, data.message.totalRecipients)} گیرنده`
          : `${data.message.totalRecipients} recipient(s)`,
      });
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setSendingMsg(false);
    }
  }

  async function copyDispatchText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: fa ? "متن پیام کپی شد" : "Message copied" });
    } catch {
      // ignore clipboard permission issues
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox label={fa ? "کل ثبت‌نام‌ها" : "Total"} value={localeNumber(lang, stats.total)} />
        <StatBox label={fa ? "در انتظار تایید" : "Pending"} value={localeNumber(lang, stats.pending)} tone="amber" />
        <StatBox label={fa ? "تایید شده" : "Confirmed"} value={localeNumber(lang, stats.confirmed)} tone="emerald" />
        <StatBox label={fa ? "پرداخت شده" : "Paid"} value={localeNumber(lang, stats.paid)} tone="emerald" />
        <StatBox label={fa ? "اعلام غیبت هنرجو" : "Leave Notices"} value={localeNumber(lang, stats.declaredLeaves)} tone={stats.declaredLeaves > 0 ? "amber" : "default"} />
        <StatBox
          label={fa ? "درآمد (تومان)" : "Revenue"}
          value={localeNumber(lang, stats.revenue)}
        />
      </div>

      {/* Workspace Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <TabButton
            active={tab === "registrations"}
            onClick={() => setTab("registrations")}
            icon={Users}
            label={fa ? "ثبت‌نام‌ها و گانت" : "Registrations & Gantt"}
            count={localeNumber(lang, registrations.length)}
          />
          <TabButton
            active={tab === "leaves"}
            onClick={() => setTab("leaves")}
            icon={CalendarDays}
            label={fa ? "اعلام غیبت‌های هنرجویان" : "Student Leave Notices"}
            count={localeNumber(lang, declaredLeaveItems.length)}
            highlight={declaredLeaveItems.length > 0}
          />
          <TabButton
            active={tab === "messages"}
            onClick={() => setTab("messages")}
            icon={MessageSquare}
            label={fa ? "کارتابل و پیام‌های ارسالی" : "Messages & Dispatch"}
            count={localeNumber(lang, messages.length)}
          />
        </div>

        {canUpdate && (
          <button
            type="button"
            onClick={openComposerForCohort}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-foreground text-background px-3.5 text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Send className="size-3.5" aria-hidden />
            <span>{fa ? "ارسال پیام جمعی / کارتابل" : "Send Group Message"}</span>
          </button>
        )}
      </div>

      {/* TAB 1: REGISTRATIONS */}
      {tab === "registrations" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid gap-2.5 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <div className="relative min-w-[200px]">
              <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  fa
                    ? "جستجو در نام، موبایل، کد رهگیری، دوره یا آیدی اجتماعی..."
                    : "Search name, phone, tracking code, course, social…"
                }
                className="w-full bg-card border border-border rounded-md py-2 ps-9 pe-3 text-sm outline-none focus:border-foreground transition-colors min-h-[40px]"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-foreground min-h-[40px]"
            >
              <option value="">{fa ? "همه دوره‌ها" : "All courses"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {fa ? c.title : c.titleEn ?? c.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-foreground min-h-[40px]"
            >
              <option value="">{fa ? "همه وضعیت‌ها" : "All statuses"}</option>
              <option value="PENDING">{regLabel(lang, "PENDING")}</option>
              <option value="CONFIRMED">{regLabel(lang, "CONFIRMED")}</option>
              <option value="CANCELLED">{regLabel(lang, "CANCELLED")}</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-foreground min-h-[40px]"
            >
              <option value="">{fa ? "همه پرداخت‌ها" : "All payments"}</option>
              <option value="UNPAID">{paymentLabel(lang, "UNPAID")}</option>
              <option value="PAID">{paymentLabel(lang, "PAID")}</option>
            </select>

            <select
              value={socialFilter}
              onChange={(e) => setSocialFilter(e.target.value as "" | SocialPlatform)}
              className="bg-card border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-foreground min-h-[40px]"
            >
              <option value="">{fa ? "همه پیام‌رسان‌ها" : "All socials"}</option>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {fa ? SOCIAL_PLATFORM_META[p].labelFa : SOCIAL_PLATFORM_META[p].labelEn}
                </option>
              ))}
            </select>

            {canExport && (
              <a
                href="/api/dashboard/registrations/export"
                download
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 border border-border bg-card rounded-md px-3.5 text-xs font-medium hover:bg-secondary transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="size-3.5" aria-hidden />
                <span>{fa ? "خروجی CSV" : "Export CSV"}</span>
              </a>
            )}
          </div>

          {/* Count + Clear + Bulk Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                {localeNumber(lang, filtered.length)} {fa ? "از" : "of"}{" "}
                {localeNumber(lang, registrations.length)} {fa ? "ثبت‌نام" : "registrations"}
              </span>
              {(search || courseFilter || statusFilter || paymentFilter || socialFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCourseFilter("");
                    setStatusFilter("");
                    setPaymentFilter("");
                    setSocialFilter("");
                  }}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Filter className="size-3" />
                  <span>{fa ? "پاک کردن فیلترها" : "Clear filters"}</span>
                </button>
              )}
            </div>

            {selectedIds.length > 0 && canUpdate && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-foreground">
                <span className="font-medium tabular-nums">
                  {localeNumber(lang, selectedIds.length)} {fa ? "نفر انتخاب‌شده" : "selected"}
                </span>
                <button
                  type="button"
                  onClick={openComposerForSelected}
                  className="inline-flex min-h-[30px] items-center gap-1 rounded bg-foreground text-background px-2.5 text-xs font-medium hover:opacity-90 whitespace-nowrap"
                >
                  <Send className="size-3" />
                  <span>{fa ? "ارسال پیام به انتخاب‌شده‌ها" : "Message selected"}</span>
                </button>
                <button
                  type="button"
                  disabled={busyId === "bulk"}
                  onClick={bulkConfirmSelected}
                  className="inline-flex min-h-[30px] items-center gap-1 rounded border border-border px-2.5 text-xs hover:bg-secondary whitespace-nowrap"
                >
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  <span>{fa ? "تایید گروهی" : "Confirm selected"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-muted-foreground hover:text-foreground px-1"
                >
                  {fa ? "لغو" : "Clear"}
                </button>
              </div>
            )}
          </div>

          {/* Registrations Table */}
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <FileText className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {registrations.length === 0
                  ? fa
                    ? "هنوز ثبت‌نامی ثبت نشده است."
                    : "No registrations yet."
                  : fa
                    ? "موردی با این فیلترها یافت نشد."
                    : "Nothing matches these filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="hidden lg:grid grid-cols-12 gap-3 border-b border-border bg-secondary/40 px-4 py-3 text-[11px] font-medium text-muted-foreground items-center">
                <div className="col-span-3 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label={fa ? "انتخاب همه" : "Select all"}
                    className="rounded border-border"
                  />
                  <span>{fa ? "هنرجو و کد رهگیری" : "Student & Tracking"}</span>
                </div>
                <div className="col-span-3">{fa ? "دوره و پیشرفت گانت" : "Course & Progress"}</div>
                <div className="col-span-2">{fa ? "شبکه‌های اجتماعی" : "Social Handles"}</div>
                <div className="col-span-2">{fa ? "وضعیت و پرداخت" : "Status & Payment"}</div>
                <div className="col-span-2 text-end">{fa ? "عملیات" : "Actions"}</div>
              </div>

              <ul className="divide-y divide-border">
                {filtered.map((r) => {
                  const isExpanded = expandedId === r.id;
                  const isSelected = selectedIds.includes(r.id);
                  const socials = listPresentSocials(r.student);
                  const gStats = r.gantt?.stats ?? null;
                  const noteDraft = noteDrafts[r.id] ?? r.note ?? "";

                  return (
                    <li
                      key={r.id}
                      className={`px-4 py-3.5 transition-colors ${
                        isSelected ? "bg-secondary/30" : "hover:bg-secondary/15"
                      }`}
                    >
                      <div className="grid grid-cols-12 gap-3 items-center">
                        {/* Student + Checkbox */}
                        <div className="col-span-12 lg:col-span-3 flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(r.id)}
                            aria-label={r.student.name}
                            className="rounded border-border shrink-0"
                          />
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-start py-1"
                          >
                            <div className="grid size-8 place-items-center rounded-md bg-secondary text-xs font-semibold shrink-0">
                              {r.student.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{r.student.name}</div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums truncate">
                                <span dir="ltr">{r.student.phone}</span>
                                {r.trackingCode && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span dir="ltr" className="font-mono text-[11px]">
                                      {r.trackingCode}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* Course + Gantt mini progress */}
                        <div className="col-span-12 sm:col-span-6 lg:col-span-3 min-w-0">
                          <Link
                            href={`/courses/${r.course.slug}`}
                            className="text-sm font-medium truncate block hover:underline underline-offset-4"
                          >
                            {fa ? r.course.title : r.course.titleEn ?? r.course.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                            <span>{tierLabel(lang, r.course.tier)}</span>
                            <span aria-hidden>·</span>
                            <span>
                              {localeNumber(lang, r.course.durationHrs)} {fa ? "ساعت" : "h"}
                            </span>
                            {gStats && r.status === "CONFIRMED" && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="text-emerald-700 font-medium">
                                  {localeNumber(lang, gStats.progressPercent)}
                                  {fa ? "٪" : "%"} ({localeNumber(lang, gStats.completedSessions)}/
                                  {localeNumber(lang, gStats.totalSessions)})
                                </span>
                              </>
                            )}
                          </div>
                          {gStats && r.status === "CONFIRMED" && (
                            <div className="mt-1.5 h-1.5 w-full max-w-[190px] rounded-sm bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-emerald-600"
                                style={{ width: `${gStats.progressPercent}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Social Handles Quick Links */}
                        <div className="col-span-12 sm:col-span-6 lg:col-span-2 flex flex-wrap items-center gap-1.5 min-w-0">
                          {socials.length === 0 ? (
                            <span className="text-xs text-rose-700">
                              {fa ? "ثبت نشده" : "Missing"}
                            </span>
                          ) : (
                            socials.map((s) => {
                              const meta = SOCIAL_PLATFORM_META[s.platform];
                              return (
                                <a
                                  key={s.platform}
                                  href={s.href || "#"}
                                  target={s.href ? "_blank" : undefined}
                                  rel="noopener noreferrer"
                                  title={`${fa ? meta.labelFa : meta.labelEn}: ${s.value}`}
                                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:border-foreground transition-colors max-w-full"
                                >
                                  <span className="font-medium text-muted-foreground">
                                    {fa ? meta.shortFa : meta.shortEn}
                                  </span>
                                  <span dir="ltr" className="truncate max-w-[85px]">
                                    {s.value}
                                  </span>
                                </a>
                              );
                            })
                          )}
                        </div>

                        {/* Status & Payment */}
                        <div className="col-span-6 lg:col-span-2 text-xs space-y-1">
                          <div className="flex items-center gap-1.5">
                            {r.status === "CONFIRMED" ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            ) : r.status === "PENDING" ? (
                              <Clock className="size-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <XCircle className="size-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span
                              className={
                                r.status === "CONFIRMED"
                                  ? "text-emerald-700 font-medium"
                                  : r.status === "PENDING"
                                    ? "text-amber-700 font-medium"
                                    : "text-muted-foreground"
                              }
                            >
                              {regLabel(lang, r.status)}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            <span
                              className={
                                r.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"
                              }
                            >
                              {paymentLabel(lang, r.paymentStatus)}
                            </span>
                            <span aria-hidden> · </span>
                            <span className="tabular-nums">{localeDate(lang, r.createdAt)}</span>
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div className="col-span-6 lg:col-span-2 flex items-center justify-end gap-1">
                          {busyId === r.id && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                          {canUpdate && r.status !== "CONFIRMED" && (
                            <button
                              type="button"
                              onClick={() => updateReg(r.id, { status: "CONFIRMED" })}
                              className="flex size-9 items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title={fa ? "تایید ثبت‌نام" : "Confirm"}
                              aria-label={fa ? "تایید ثبت‌نام" : "Confirm"}
                            >
                              <CheckCircle2 className="size-4" />
                            </button>
                          )}
                          {canUpdate && r.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => updateReg(r.id, { status: "CANCELLED" })}
                              className="flex size-9 items-center justify-center text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                              title={fa ? "لغو ثبت‌نام" : "Cancel"}
                              aria-label={fa ? "لغو ثبت‌نام" : "Cancel"}
                            >
                              <XCircle className="size-4" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() =>
                                updateReg(r.id, {
                                  paymentStatus: r.paymentStatus === "PAID" ? "UNPAID" : "PAID",
                                })
                              }
                              className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                                r.paymentStatus === "PAID"
                                  ? "text-emerald-700 bg-emerald-50"
                                  : "text-muted-foreground hover:bg-secondary"
                              }`}
                              title={fa ? "تغییر وضعیت پرداخت" : "Toggle payment"}
                              aria-label={fa ? "تغییر وضعیت پرداخت" : "Toggle payment"}
                            >
                              <FileText className="size-4" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openComposerForSingle(r)}
                              className="flex size-9 items-center justify-center text-foreground/80 hover:bg-secondary rounded-md transition-colors"
                              title={fa ? "ارسال پیام به کارتابل و پیام‌رسان" : "Message student"}
                              aria-label={fa ? "ارسال پیام" : "Message student"}
                            >
                              <Send className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                            className="flex size-9 items-center justify-center text-muted-foreground hover:bg-secondary rounded-md transition-colors"
                            title={fa ? "پرونده و گانت پیشرفت" : "Details & Gantt"}
                            aria-label={fa ? "پرونده و گانت پیشرفت" : "Details & Gantt"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => deleteReg(r.id)}
                              className="flex size-9 items-center justify-center text-destructive hover:bg-destructive/5 rounded-md transition-colors"
                              title={fa ? "حذف ثبت‌نام" : "Delete"}
                              aria-label={fa ? "حذف ثبت‌نام" : "Delete"}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Dossier + GitHub Progress Gantt */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border space-y-5">
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            {/* Student Dossier & Socials */}
                            <div className="rounded-md border border-border bg-secondary/15 p-4 space-y-2.5">
                              <div className="text-xs font-medium text-muted-foreground">
                                {fa ? "پروفایل و راه‌های ارتباطی هنرجو" : "Student Profile & Socials"}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                                <span className="inline-flex items-center gap-1.5">
                                  <Phone className="size-3.5 text-muted-foreground" />
                                  <span dir="ltr" className="tabular-nums">{r.student.phone}</span>
                                </span>
                                {r.student.email && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Mail className="size-3.5 text-muted-foreground" />
                                    <span dir="ltr">{r.student.email}</span>
                                  </span>
                                )}
                              </div>
                              {(r.student.field || r.student.education) && (
                                <div className="text-xs text-muted-foreground">
                                  {r.student.field ? `${fa ? "رشته:" : "Field:"} ${r.student.field}` : ""}
                                  {r.student.field && r.student.education ? " · " : ""}
                                  {r.student.education
                                    ? `${fa ? "سوابق:" : "Education:"} ${r.student.education}`
                                    : ""}
                                </div>
                              )}
                              <div className="pt-1 flex flex-wrap gap-2">
                                {socials.map((s) => {
                                  const meta = SOCIAL_PLATFORM_META[s.platform];
                                  return (
                                    <a
                                      key={s.platform}
                                      href={s.href || "#"}
                                      target={s.href ? "_blank" : undefined}
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:border-foreground transition-colors"
                                    >
                                      <span className="text-muted-foreground">
                                        {fa ? meta.labelFa : meta.labelEn}:
                                      </span>
                                      <span dir="ltr" className="font-medium">{s.value}</span>
                                      {s.href && <ExternalLink className="size-3 text-muted-foreground" />}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Registration & Admin Note */}
                            <div className="rounded-md border border-border bg-secondary/15 p-4 space-y-2.5">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{fa ? "جزئیات ثبت‌نام و یادداشت" : "Enrollment & Admin Note"}</span>
                                <span className="tabular-nums">{localePrice(lang, r.course.price)}</span>
                              </div>
                              <div className="flex gap-2">
                                <textarea
                                  rows={2}
                                  value={noteDraft}
                                  onChange={(e) =>
                                    setNoteDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                                  }
                                  placeholder={
                                    fa ? "یادداشت داخلی مدیر یا توضیحات..." : "Admin note..."
                                  }
                                  className="flex-1 bg-background border border-border rounded-md p-2.5 text-xs outline-none focus:border-foreground resize-y"
                                />
                                {canUpdate && (
                                  <button
                                    type="button"
                                    disabled={busyId === r.id}
                                    onClick={() => updateReg(r.id, { note: noteDraft })}
                                    className="inline-flex items-center gap-1 self-start rounded-md border border-border bg-background px-3 min-h-[36px] text-xs font-medium hover:bg-secondary whitespace-nowrap"
                                  >
                                    <Save className="size-3.5" />
                                    <span>{fa ? "ذخیره" : "Save"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* GitHub-Style Progress & Attendance Gantt */}
                          {r.gantt && (
                            <AttendanceGantt
                              initialGantt={r.gantt}
                              mode="admin"
                              courseTitle={fa ? r.course.title : r.course.titleEn ?? r.course.title}
                              onGanttChange={(next) => {
                                setRegistrations((prev) =>
                                  prev.map((item) =>
                                    item.id === r.id ? { ...item, gantt: next } : item,
                                  ),
                                );
                              }}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENT LEAVE NOTICES (DECLARED ABSENCES) */}
      {tab === "leaves" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
            {fa
              ? "غیبت‌هایی که هنرآموزان از طریق گانت خود برای روزهای جاری یا آینده اعلام کرده‌اند در اینجا نمایش داده می‌شوند. لغو غیبت فقط با مدیر است."
              : "Upcoming or active absence notices declared by students via their Gantt. Only administrators can cancel a declared absence."}
          </div>

          {declaredLeaveItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <CalendarDays className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {fa
                  ? "در حال حاضر هیچ اعلام غیبت در انتظار یا قفل‌شده‌ای ثبت نشده است."
                  : "No declared absence notices at the moment."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <ul className="divide-y divide-border">
                {declaredLeaveItems.map((item) => {
                  const key = `${item.reg.id}:${item.dateKey}`;
                  const busy = busyId === key;
                  return (
                    <li key={key} className="p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span>{item.reg.student.name}</span>
                          <span className="text-muted-foreground" aria-hidden>·</span>
                          <span className="text-xs text-muted-foreground">
                            {fa ? item.reg.course.title : item.reg.course.titleEn ?? item.reg.course.title}
                          </span>
                          {item.sessionIndex && (
                            <>
                              <span className="text-muted-foreground" aria-hidden>·</span>
                              <span className="text-xs text-amber-700">
                                {formatSessionLabel(lang, item.sessionIndex)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fa ? item.jalaliFull : item.gregorianFull}
                          {item.declaredAt && (
                            <>
                              <span aria-hidden> · </span>
                              <span>
                                {fa ? "ثبت‌شده در:" : "Declared:"} {localeDateTime(lang, item.declaredAt)}
                              </span>
                            </>
                          )}
                        </div>
                        {item.studentNote && (
                          <div className="text-xs text-foreground/90 bg-secondary/30 rounded px-2.5 py-1.5 inline-block">
                            {item.studentNote}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canUpdate && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleLeaveDecision(item.reg.id, item.dateKey, "CANCEL_LEAVE")
                              }
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-sky-600 text-white px-3 text-xs font-medium hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap"
                            >
                              <RotateCcw className="size-3.5" />
                              <span>{fa ? "لغو غیبت ارسالی" : "Cancel Leave"}</span>
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleLeaveDecision(item.reg.id, item.dateKey, "MARK_ABSENT")
                              }
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary disabled:opacity-50 whitespace-nowrap"
                            >
                              <XCircle className="size-3.5 text-rose-600" />
                              <span>{fa ? "تایید غیبت" : "Mark Absent"}</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setTab("registrations");
                            setExpandedId(item.reg.id);
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary whitespace-nowrap"
                        >
                          <span>{fa ? "باز کردن گانت" : "Open Gantt"}</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CARTABLE & DISPATCH LOG */}
      {tab === "messages" && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <MessageSquare className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {fa
                  ? "هنوز پیامی به کارتابل هنرآموزان ارسال نشده است."
                  : "No messages sent to students yet."}
              </p>
              {canUpdate && (
                <button
                  type="button"
                  onClick={openComposerForCohort}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-foreground text-background px-4 text-xs font-medium"
                >
                  <Send className="size-3.5" />
                  <span>{fa ? "ارسال اولین پیام" : "Send First Message"}</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => {
                const courseLabel = m.course
                  ? fa
                    ? m.course.title
                    : m.course.titleEn ?? m.course.title
                  : null;
                return (
                  <li key={m.id} className="rounded-lg border border-border bg-card p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{m.title}</h3>
                          {m.isBroadcast && (
                            <span className="text-[11px] text-muted-foreground">
                              · {fa ? "ارسال جمعی" : "Broadcast"}
                            </span>
                          )}
                          {courseLabel && (
                            <span className="text-[11px] text-muted-foreground">
                              · {courseLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
                          <span>{localeDateTime(lang, m.createdAt)}</span>
                          <span aria-hidden>·</span>
                          <span>
                            {fa ? "کانال‌ها:" : "Channels:"} {m.channels.join(" · ")}
                          </span>
                          <span aria-hidden>·</span>
                          <span className="text-emerald-700 font-medium">
                            {fa ? "خوانده‌شده:" : "Read:"} {localeNumber(lang, m.readCount)}/
                            {localeNumber(lang, m.totalRecipients)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap bg-secondary/20 rounded-md p-3 border border-border/60">
                      {m.body}
                    </p>

                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-muted-foreground">
                        {fa ? "وضعیت گیرندگان و لینک ارسال پیام‌رسان / ایمیل" : "Recipients & Direct Dispatch Links"}
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {m.recipients.map((rec) => (
                          <div
                            key={rec.id}
                            className="rounded-md border border-border bg-background p-2.5 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{rec.studentName}</span>
                              <span
                                className={
                                  rec.readAt ? "text-emerald-700" : "text-muted-foreground"
                                }
                              >
                                {rec.readAt
                                  ? fa
                                    ? "خوانده‌شده"
                                    : "Read"
                                  : fa
                                    ? "در کارتابل"
                                    : "Unread"}
                              </span>
                            </div>
                            {rec.emailStatus && rec.emailStatus !== "SKIPPED" && (
                              <div className="text-[11px] text-muted-foreground">
                                {fa ? "ایمیل:" : "Email:"}{" "}
                                {rec.emailStatus === "SENT"
                                  ? fa
                                    ? "ارسال شد"
                                    : "Sent"
                                  : rec.emailStatus === "NOT_CONFIGURED"
                                    ? fa
                                      ? "SMTP تنظیم نشده (لینک mailto آماده است)"
                                      : "SMTP not configured (mailto ready)"
                                    : rec.emailStatus === "NO_EMAIL"
                                      ? fa
                                        ? "بدون ایمیل"
                                        : "No email"
                                      : fa
                                        ? "خطا در ارسال"
                                        : "Failed"}
                              </div>
                            )}
                            {rec.links.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {rec.links.map((lnk) => (
                                  <a
                                    key={`${lnk.channel}:${lnk.handle}`}
                                    href={lnk.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] hover:border-foreground transition-colors"
                                  >
                                    <span>{lnk.channel}</span>
                                    <ExternalLink className="size-2.5" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* MESSAGE COMPOSER MODAL */}
      {composerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl max-h-[90svh] overflow-y-auto rounded-lg border border-border bg-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold">
                  {fa ? "ارسال پیام به کارتابل، ایمیل و پیام‌رسان‌ها" : "Send Message to Cartable, Email & Messengers"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {composerTarget.kind === "single"
                    ? `${fa ? "گیرنده:" : "Recipient:"} ${composerTarget.studentName}`
                    : composerTarget.kind === "selected"
                      ? `${localeNumber(lang, composerTarget.ids.length)} ${fa ? "هنرجوی انتخاب‌شده" : "selected students"}`
                      : fa
                        ? "ارسال جمعی به هنرآموزان بر اساس فیلتر دوره و وضعیت"
                        : "Bulk broadcast by course and status"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-secondary"
                aria-label={fa ? "بستن" : "Close"}
              >
                <X className="size-4" />
              </button>
            </div>

            {composerTarget.kind === "cohort" && (
              <div className="grid sm:grid-cols-2 gap-3 rounded-md border border-border bg-secondary/20 p-3.5">
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    {fa ? "فیلتر دوره" : "Course cohort"}
                  </label>
                  <select
                    value={composerTarget.courseId}
                    onChange={(e) =>
                      setComposerTarget({ ...composerTarget, courseId: e.target.value })
                    }
                    className="bg-background border border-border rounded-md px-3 py-2 text-xs min-h-[38px]"
                  >
                    <option value="">{fa ? "همه دوره‌ها" : "All courses"}</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {fa ? c.title : c.titleEn ?? c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    {fa ? "وضعیت ثبت‌نام" : "Registration status"}
                  </label>
                  <select
                    value={composerTarget.statusFilter}
                    onChange={(e) =>
                      setComposerTarget({ ...composerTarget, statusFilter: e.target.value })
                    }
                    className="bg-background border border-border rounded-md px-3 py-2 text-xs min-h-[38px]"
                  >
                    <option value="">{fa ? "همه فعال‌ها (بجز لغوشده)" : "All active"}</option>
                    <option value="CONFIRMED">{regLabel(lang, "CONFIRMED")}</option>
                    <option value="PENDING">{regLabel(lang, "PENDING")}</option>
                  </select>
                </div>
              </div>
            )}

            <form onSubmit={sendComposedMessage} className="space-y-4">
              {/* Channels */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {fa ? "کانال‌های ارسال" : "Delivery Channels"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "CARTABLE", label: fa ? "کارتابل داخلی (ثابت)" : "Student Cartable (always)" },
                      { id: "EMAIL", label: fa ? "ایمیل" : "Email" },
                      { id: "TELEGRAM", label: fa ? "تلگرام" : "Telegram" },
                      { id: "WHATSAPP", label: fa ? "واتساپ" : "WhatsApp" },
                      { id: "EITAA", label: fa ? "ایتا" : "Eitaa" },
                      { id: "BALE", label: fa ? "بله" : "Bale" },
                    ] as Array<{ id: MessageChannel; label: string }>
                  ).map((ch) => {
                    const checked = msgChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-3 text-xs transition-colors whitespace-nowrap ${
                          checked
                            ? "border-foreground bg-foreground text-background font-medium"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
                {msgChannels.includes("EMAIL") && !capabilities.smtpConfigured && (
                  <p className="text-[11px] text-amber-700">
                    {fa
                      ? "تنظیمات SMTP در سرور تعریف نشده است؛ پس از ثبت در کارتابل، لینک آماده ایمیل (mailto) برای ارسال سریع ساخته می‌شود."
                      : "SMTP env vars are not configured; mailto dispatch links will be generated after saving to Cartable."}
                  </p>
                )}
              </div>

              {/* Quick Templates */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: fa ? "تایید ثبت‌نام" : "Enrollment Confirmed",
                    title: fa ? "تایید ثبت‌نام و شروع دوره در آکادمی نیله" : "Enrollment Confirmed — Neeleh Academy",
                    body: fa
                      ? "سلام! ثبت‌نام شما در دوره تایید شد. فایل‌ها، جزوات و گانت حضور و غیاب اکنون در پنل هنرجویی شما فعال است."
                      : "Your registration has been confirmed. Handouts and your attendance Gantt are now active in your student panel.",
                  },
                  {
                    label: fa ? "یادآوری جلسه" : "Session Reminder",
                    title: fa ? "یادآوری جلسه پیشِ‌رو" : "Upcoming Class Session Reminder",
                    body: fa
                      ? "سلام، یادآوری می‌کنیم جلسه بعدی دوره طبق برنامه در گانت پنل شما برگزار می‌شود. در صورت عدم امکان حضور، لطفاً پیش از جلسه در گانت اعلام فرمایید."
                      : "Friendly reminder that your next scheduled session is coming up. If you cannot attend, please declare your absence ahead of time in your Gantt.",
                  },
                  {
                    label: fa ? "پیگیری شهریه" : "Tuition Follow-up",
                    title: fa ? "یادآوری تکمیل شهریه دوره" : "Course Tuition Follow-up",
                    body: fa
                      ? "سلام، برای نهایی‌شدن پرونده و دسترسی کامل به فایل‌های تکمیلی، لطفاً وضعیت تسویه شهریه خود را با واحد آموزش هماهنگ فرمایید."
                      : "Please coordinate your tuition settlement with our administration team to finalize your enrollment.",
                  },
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      setMsgTitle(tpl.title);
                      setMsgBody(tpl.body);
                    }}
                    className="rounded border border-border bg-secondary/40 px-2.5 py-1 text-[11px] hover:bg-secondary transition-colors"
                  >
                    + {tpl.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">
                  {fa ? "عنوان پیام *" : "Subject *"}
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={160}
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  placeholder={fa ? "مثلاً: یادآوری جلسه اول دوره رویت" : "Subject line…"}
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground min-h-[42px]"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">
                  {fa ? "متن پیام *" : "Message body *"}
                </label>
                <textarea
                  required
                  minLength={2}
                  maxLength={4000}
                  rows={4}
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder={fa ? "متن اطلاعیه یا پیام خود را بنویسید..." : "Write your message…"}
                  className="bg-background border border-border rounded-md p-3 text-sm outline-none focus:border-foreground resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="min-h-[40px] rounded-md border border-border px-4 text-xs font-medium hover:bg-secondary"
                >
                  {fa ? "بستن" : "Close"}
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-foreground text-background px-5 text-xs font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  {sendingMsg ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  <span>{fa ? "ثبت در کارتابل و آماده‌سازی ارسال" : "Send to Cartable & Dispatch"}</span>
                </button>
              </div>
            </form>

            {/* Immediate Post-Send Messenger & Email Dispatch Queue */}
            {lastDispatch && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-emerald-900">
                    {fa
                      ? `پیام در کارتابل ${localeNumber(lang, lastDispatch.totalRecipients)} هنرجو ثبت شد`
                      : `Delivered to ${lastDispatch.totalRecipients} student Cartable(s)`}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyDispatchText(`${lastDispatch.title}\n\n${lastDispatch.body}`)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-secondary"
                  >
                    <Copy className="size-3" />
                    <span>{fa ? "کپی متن پیام" : "Copy text"}</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {lastDispatch.recipients.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded border border-border bg-background px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium">{rec.studentName}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rec.emailStatus === "SENT" && (
                          <span className="text-emerald-700 font-medium">
                            {fa ? "ایمیل ارسال شد" : "Email sent"}
                          </span>
                        )}
                        {rec.links.map((lnk) => (
                          <a
                            key={`${lnk.channel}:${lnk.handle}`}
                            href={lnk.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-foreground text-background px-2.5 py-1 text-[11px] font-medium hover:opacity-90"
                          >
                            <span>
                              {fa ? "ارسال در" : "Open"} {lnk.channel}
                            </span>
                            <ExternalLink className="size-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "amber" | "emerald" | "default";
}) {
  const cls =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
        ? "text-emerald-700"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className={`text-xl sm:text-2xl font-medium tabular-nums ${cls}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground truncate">{label}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      <span>{label}</span>
      <span
        className={`tabular-nums text-[11px] ${
          active
            ? "opacity-80"
            : highlight
              ? "text-amber-700 font-semibold"
              : "text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
