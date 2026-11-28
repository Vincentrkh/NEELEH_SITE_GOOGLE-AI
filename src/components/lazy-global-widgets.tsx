"use client";

import dynamic from "next/dynamic";
import type { LiveOverrideRule } from "@/lib/live-overrides";

const SmartSearchDialog = dynamic(
  () => import("@/components/smart-search").then((m) => m.SmartSearchDialog),
  { ssr: false },
);

const AdminLiveInspector = dynamic(
  () => import("@/components/admin-live-inspector").then((m) => m.AdminLiveInspector),
  { ssr: false },
);

export function LazyGlobalWidgets({
  initialIsAdmin,
  initialRules,
}: {
  initialIsAdmin: boolean;
  initialRules: LiveOverrideRule[];
}) {
  return (
    <>
      <SmartSearchDialog />
      {initialIsAdmin ? (
        <AdminLiveInspector
          initialIsAdmin={initialIsAdmin}
          initialRules={initialRules}
        />
      ) : null}
    </>
  );
}
