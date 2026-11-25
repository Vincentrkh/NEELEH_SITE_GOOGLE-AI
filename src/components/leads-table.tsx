"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { faDateTime, LEAD_STATUS_LABEL } from "@/lib/format";
import {
  Search,
  Phone,
  Mail,
  Trash2,
  CheckCircle2,
  UserPlus,
  Loader2,
  Inbox,
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  status: "NEW" | "CONTACTED" | "CONVERTED";
  note: string | null;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800",
  CONTACTED: "bg-blue-100 text-blue-800",
  CONVERTED: "bg-emerald-100 text-emerald-800",
};

export function LeadsTable({
  initialLeads,
  canUpdate,
  canDelete,
}: {
  initialLeads: Lead[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, search, statusFilter]);

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/dashboard/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      setLeads((list) => list.map((l) => (l.id === id ? { ...l, status: status as Lead["status"] } : l)));
      toast({ title: "به‌روزرسانی شد" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("این لید حذف شود؟")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/dashboard/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "خطا", description: "حذف نشد", variant: "destructive" });
        return;
      }
      setLeads((list) => list.filter((l) => l.id !== id));
      toast({ title: "حذف شد" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در نام، موبایل یا پیام..."
            className="w-full bg-card border border-border rounded-md py-2.5 ps-10 pe-3 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="NEW">جدید</option>
          <option value="CONTACTED">تماس گرفته شد</option>
          <option value="CONVERTED">تبدیل به هنرجو</option>
        </select>
      </div>

      <div className="text-xs text-muted-foreground">
        {faDateTime(null) ? "" : ""}
        {filtered.length} از {leads.length} لید
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Inbox className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {leads.length === 0 ? "هنوز لیدی ثبت نشده است." : "موردی یافت نشد."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((l) => {
            const isExpanded = expanded === l.id;
            return (
              <li
                key={l.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700 text-sm font-medium shrink-0">
                      {l.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : l.id)}
                        className="block text-start w-full min-h-[44px]"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{l.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE[l.status]}`}>
                            {LEAD_STATUS_LABEL[l.status]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                          {l.phone}
                        </div>
                      </button>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {l.message || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat("fa-IR", {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(l.createdAt))}
                      </span>
                      {busy === l.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {canUpdate && l.status !== "CONTACTED" && l.status !== "CONVERTED" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(l.id, "CONTACTED")}
                        className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary transition-colors"
                      >
                        <Phone className="size-3" />
                        تماس گرفتم
                      </button>
                    )}
                    {canUpdate && l.status !== "CONVERTED" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(l.id, "CONVERTED")}
                        className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        <UserPlus className="size-3" />
                        تبدیل به هنرجو
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteLead(l.id)}
                        className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs text-destructive hover:bg-destructive/5 transition-colors ms-auto"
                      >
                        <Trash2 className="size-3" />
                        حذف
                      </button>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="size-3 text-muted-foreground" />
                          <a href={`tel:${l.phone}`} dir="ltr" className="text-start hover:text-foreground">
                            {l.phone}
                          </a>
                        </div>
                        {l.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="size-3 text-muted-foreground" />
                            <a href={`mailto:${l.email}`} dir="ltr" className="text-start hover:text-foreground">
                              {l.email}
                            </a>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                          پیام کامل
                        </div>
                        <p className="text-sm leading-relaxed">{l.message || "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
