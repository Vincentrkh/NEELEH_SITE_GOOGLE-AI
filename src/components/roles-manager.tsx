"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_GROUPS, ALL_PERMISSIONS } from "@/lib/permissions";
import { faNumber } from "@/lib/format";
import { Loader2, Shield, Check, Users } from "lucide-react";

type Permission = { id: string; key: string; label: string };
type Role = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  permissionsArray: Permission[];
  userCount: number;
};

export function RolesManager({ initialRoles }: { initialRoles: Role[] }) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedId, setSelectedId] = useState<string | null>(initialRoles[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  const selected = roles.find((r) => r.id === selectedId);
  const [permissionIds, setPermissionIds] = useState<Set<string>>(
    new Set(selected?.permissionsArray.map((p) => p.id) ?? [])
  );

  function selectRole(id: string) {
    const r = roles.find((x) => x.id === id);
    setSelectedId(id);
    setPermissionIds(new Set(r?.permissionsArray.map((p) => p.id) ?? []));
  }

  function togglePermission(id: string) {
    setPermissionIds((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function savePermissions() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/roles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(permissionIds) }),
      });
      if (!res.ok) {
        toast({ title: "خطا", variant: "destructive" });
        return;
      }
      setRoles((list) =>
        list.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                permissionsArray: ALL_PERMISSIONS.filter((p) =>
                  permissionIds.has(p.id) || ALL_PERMISSIONS.findIndex((ap) => ap.key === p.key) === -1
                ).filter((p) => permissionIds.has(p.id)),
              }
            : r
        )
      );
      toast({ title: "مجوزها ذخیره شدند" });
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return <p className="text-sm text-muted-foreground">هیچ نقشی وجود ندارد.</p>;
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      {/* Roles list */}
      <div className="space-y-2">
        {roles.map((r) => {
          const active = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRole(r.id)}
              className={`w-full text-start p-4 rounded-lg border transition-colors ${
                active
                  ? "border-foreground bg-secondary"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="size-4 text-muted-foreground" />
                <span className="font-medium flex-1">{r.label}</span>
                {r.isSystem && (
                  <span className="text-[10px] uppercase tracking-[0.1em] border border-border px-1 py-0.5 text-muted-foreground">
                    سیستمی
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.name} • {faNumber(r.permissionsArray.length)} مجوز • {faNumber(r.userCount)} کاربر
              </div>
            </button>
          );
        })}
      </div>

      {/* Permissions grid */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-medium">{selected.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selected.description ?? `نقش ${selected.name}`}
            </p>
          </div>
          <button
            type="button"
            onClick={savePermissions}
            disabled={busy}
            className="flex min-h-[44px] items-center gap-2 bg-foreground text-background rounded-md px-5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            ذخیره مجوزها
          </button>
        </div>

        {/* Permission groups */}
        <div className="space-y-4">
          {PERMISSION_GROUPS.map((group) => {
            // پیدا کردن permission IDs این گروه بر اساس key
            const groupPerms = ALL_PERMISSIONS.filter((p) =>
              group.permissions.some((gp) => gp.key === p.key)
            );
            return (
              <div
                key={group.label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </h3>
                  <span className="text-xs text-muted-foreground/60">
                    {faNumber(groupPerms.filter((p) => permissionIds.has(p.id)).length)}/{faNumber(groupPerms.length)}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {groupPerms.map((p) => {
                    const active = permissionIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePermission(p.id)}
                        className={`flex min-h-[44px] items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-secondary"
                            : "hover:bg-secondary/40"
                        }`}
                      >
                        <span className={`size-4 rounded border flex items-center justify-center shrink-0 ${
                          active ? "border-foreground bg-foreground text-background" : "border-border"
                        }`}>
                          {active && <Check className="size-3" />}
                        </span>
                        <span className="flex-1 text-start">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
