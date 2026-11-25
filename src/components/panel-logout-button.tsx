"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function PanelLogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout/", { method: "POST" });
    } finally {
      router.push("/login/");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="flex min-h-[44px] items-center gap-1.5 px-3 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <LogOut className="size-3.5" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
