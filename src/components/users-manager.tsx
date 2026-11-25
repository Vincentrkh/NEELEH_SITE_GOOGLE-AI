"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { faNumber, faDate } from "@/lib/format";
import {
  Search,
  Loader2,
  Trash2,
  User,
  BookOpen,
  FileText,
  Newspaper,
} from "lucide-react";

type Role = { id: string; name: string; label: string; isSystem: boolean };
type UserRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  field: string | null;
  rolesArray: Role[];
  registrationCount: number;
  postCount: number;
  fileCount: number;
  createdAt: string;
  isSelf: boolean;
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-rose-100 text-rose-800",
  EDITOR: "bg-amber-100 text-amber-800",
  STUDENT: "bg-blue-100 text-blue-800",
};

export function UsersManager({
  initialUsers,
  roles,
  canUpdate,
  canDelete,
}: {
  initialUsers: UserRow[];
  roles: Role[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  async function toggleRole(userId: string, roleId: string, has: boolean) {
    setBusy(userId);
    try {
      const u = users.find((x) => x.id === userId);
      if (!u) return;
      const newRoleIds = has
        ? u.rolesArray.filter((r) => r.id !== roleId).map((r) => r.id)
        : [...u.rolesArray.map((r) => r.id), roleId];
      const res = await fetch(`/api/dashboard/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: newRoleIds }),
      });
      if (!res.ok) {
        toast({ title: "خطا", variant: "destructive" });
        return;
      }
      setUsers((list) =>
        list.map((x) =>
          x.id === userId
            ? {
                ...x,
                rolesArray: has
                  ? x.rolesArray.filter((r) => r.id !== roleId)
                  : [...x.rolesArray, roles.find((r) => r.id === roleId)!].filter(Boolean),
              }
            : x
        )
      );
      toast({ title: "به‌روزرسانی شد" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("این کاربر حذف شود؟ تمام ثبت‌نام‌ها و داده‌های مرتبط هم حذف می‌شوند.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/dashboard/users/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
        return;
      }
      setUsers((list) => list.filter((u) => u.id !== id));
      toast({ title: "حذف شد" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در نام، موبایل یا ایمیل..."
          className="w-full bg-card border border-border rounded-md py-2.5 ps-10 pe-3 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {faNumber(filtered.length)} از {faNumber(users.length)} کاربر
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <User className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">کاربری یافت نشد.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden md:grid grid-cols-12 gap-3 border-b border-border bg-secondary/40 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <div className="col-span-4">کاربر</div>
            <div className="col-span-3">نقش‌ها</div>
            <div className="col-span-3 text-center">آمار</div>
            <div className="col-span-2 text-end">تاریخ</div>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((u) => {
              const isExpanded = expanded === u.id;
              return (
                <li key={u.id} className="px-4 py-4 hover:bg-secondary/20 transition-colors">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : u.id)}
                      className="col-span-12 md:col-span-4 flex items-center gap-3 min-h-[44px] text-start"
                    >
                      <div className="grid size-9 place-items-center rounded-full bg-foreground text-background text-xs font-bold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {u.name}
                          {u.isSelf && (
                            <span className="ms-2 text-[10px] text-muted-foreground">(شما)</span>
                          )}
                        </div>
                        <div dir="ltr" className="text-xs text-muted-foreground text-start truncate">
                          {u.phone}
                        </div>
                      </div>
                    </button>

                    <div className="col-span-6 md:col-span-3 flex flex-wrap gap-1">
                      {u.rolesArray.map((r) => (
                        <span
                          key={r.id}
                          className={`text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded ${
                            ROLE_BADGE[r.name] ?? "bg-secondary text-foreground"
                          }`}
                        >
                          {r.label}
                        </span>
                      ))}
                      {u.rolesArray.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">بدون نقش</span>
                      )}
                    </div>

                    <div className="col-span-6 md:col-span-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" title="ثبت‌نام‌ها">
                        <BookOpen className="size-3" />
                        {faNumber(u.registrationCount)}
                      </span>
                      <span className="flex items-center gap-1" title="مقالات">
                        <Newspaper className="size-3" />
                        {faNumber(u.postCount)}
                      </span>
                      <span className="flex items-center gap-1" title="فایل‌ها">
                        <FileText className="size-3" />
                        {faNumber(u.fileCount)}
                      </span>
                    </div>

                    <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {faDate(u.createdAt)}
                      </span>
                      {busy === u.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded — role assignment */}
                  {isExpanded && canUpdate && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
                        نقش‌های کاربر
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {roles.map((r) => {
                          const has = u.rolesArray.some((ur) => ur.id === r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleRole(u.id, r.id, has)}
                              className={`flex min-h-[44px] items-center gap-2 px-3 rounded-md border text-sm transition-colors ${
                                has
                                  ? "border-foreground bg-secondary"
                                  : "border-border hover:bg-secondary/40"
                              }`}
                            >
                              <span className={`size-3 rounded border flex items-center justify-center ${
                                has ? "border-foreground bg-foreground" : "border-border"
                              }`}>
                                {has && <span className="size-1.5 bg-background rounded-full" />}
                              </span>
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                      {canDelete && !u.isSelf && (
                        <button
                          type="button"
                          onClick={() => deleteUser(u.id)}
                          className="flex min-h-[44px] items-center gap-2 text-sm text-destructive hover:bg-destructive/5 rounded-md px-3 transition-colors"
                        >
                          <Trash2 className="size-4" />
                          حذف کاربر
                        </button>
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
  );
}
