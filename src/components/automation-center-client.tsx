"use client";

import { useState } from "react";
import { Check, ShieldAlert, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";

type IntegrationItem = {
  id: string;
  nameFa: string;
  nameEn: string;
  configured: boolean;
  statusFa: string;
  statusEn: string;
  envHint: string;
};

type WorkflowItem = {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  triggerEvent: string;
  enabled: boolean;
  requiresApproval: boolean;
  description: string | null;
  descriptionEn: string | null;
};

type ApprovalItem = {
  id: string;
  kind: string;
  title: string;
  entityType: string;
  entityId: string;
  proposedAction: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
};

type EventItem = {
  id: string;
  name: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

type AiUsageItem = {
  id: string;
  feature: string;
  model: string;
  status: string;
  latencyMs: number | null;
  errorCode: string | null;
  createdAt: string;
};

export function AutomationCenterClient({
  initialWorkflows,
  initialApprovals,
  initialEvents,
  initialUsage,
  integrations,
}: {
  initialWorkflows: WorkflowItem[];
  initialApprovals: ApprovalItem[];
  initialEvents: EventItem[];
  initialUsage: AiUsageItem[];
  integrations: IntegrationItem[];
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleWorkflow(wf: WorkflowItem) {
    setBusyId(wf.id);
    try {
      const res = await fetch("/api/dashboard/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_workflow",
          workflowId: wf.id,
          enabled: !wf.enabled,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; workflow?: WorkflowItem; error?: string };
      if (!res.ok || !data.workflow) {
        toast({ title: fa ? "خطا" : "Failed", description: data.error, variant: "destructive" });
        return;
      }
      setWorkflows((prev) => prev.map((item) => (item.id === wf.id ? data.workflow! : item)));
      toast({ title: fa ? "وضعیت اتوماسیون به‌روزرسانی شد" : "Workflow updated" });
    } finally {
      setBusyId(null);
    }
  }

  async function reviewApproval(task: ApprovalItem, decision: "APPROVED" | "REJECTED") {
    setBusyId(task.id);
    try {
      const res = await fetch("/api/dashboard/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_approval",
          approvalId: task.id,
          decision,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; approval?: ApprovalItem; error?: string };
      if (!res.ok || !data.approval) {
        toast({ title: fa ? "خطا" : "Failed", description: data.error, variant: "destructive" });
        return;
      }
      setApprovals((prev) =>
        prev.map((item) => (item.id === task.id ? { ...item, status: data.approval!.status } : item))
      );
      toast({
        title:
          decision === "APPROVED"
            ? fa
              ? "تأیید و اعمال شد"
              : "Approved & applied"
            : fa
              ? "رد شد"
              : "Rejected",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Integration Readiness Status */}
      <section>
        <h2 className="text-sm font-semibold mb-3">
          {fa ? "وضعیت واقعی اتصال سرویس‌ها" : "Integration Readiness"}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((intg) => (
            <div key={intg.id} className="rounded-lg border border-border bg-card p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{fa ? intg.nameFa : intg.nameEn}</span>
                <span
                  className={`text-xs font-medium ${
                    intg.configured ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {intg.configured ? (fa ? "فعال" : "Ready") : fa ? "تنظیم نشده" : "Not configured"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{fa ? intg.statusFa : intg.statusEn}</p>
              <div dir="ltr" className="text-[11px] font-mono text-muted-foreground/80">
                {intg.envHint}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow Definitions + Kill Switch */}
      <section>
        <h2 className="text-sm font-semibold mb-3">
          {fa ? "قوانین اتوماسیون و کلید توقف سریع" : "Workflow Definitions & Kill Switches"}
        </h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {workflows.map((wf) => (
            <div key={wf.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fa ? wf.name : wf.nameEn || wf.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">({wf.triggerEvent})</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fa ? wf.description : wf.descriptionEn || wf.description}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === wf.id}
                onClick={() => toggleWorkflow(wf)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  wf.enabled
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                {wf.enabled ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                <span>{wf.enabled ? (fa ? "فعال" : "Enabled") : fa ? "متوقف" : "Paused"}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Human-in-the-loop Approval Queue */}
      <section>
        <h2 className="text-sm font-semibold mb-3">
          {fa ? "صف تأیید انسانی (Approval Queue)" : "Human Approval Queue"}
        </h2>
        {approvals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {fa
              ? "در حال حاضر هیچ موردی در صف تأیید نیست."
              : "No pending approval tasks yet. Submit a consultation lead or registration to trigger workflows."}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {approvals.map((task) => (
              <div key={task.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{task.kind}</span>
                    <span aria-hidden>·</span>
                    <span
                      className={`font-medium ${
                        task.status === "APPROVED"
                          ? "text-emerald-700"
                          : task.status === "REJECTED"
                            ? "text-rose-700"
                            : "text-amber-700"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{task.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.proposedAction}</p>
                </div>

                {task.status === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => reviewApproval(task, "APPROVED")}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-md bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                      <span>{fa ? "تأیید و اعمال" : "Approve"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => reviewApproval(task, "REJECTED")}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-md border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                      <span>{fa ? "رد" : "Reject"}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Domain Events & AI Ledger */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold mb-3">
            {fa ? "رویدادهای ثبت‌شده سیستم" : "Recent Domain Events"}
          </h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {initialEvents.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground text-center">
                {fa ? "هنوز رویدادی ثبت نشده است." : "No domain events recorded yet."}
              </div>
            ) : (
              initialEvents.slice(0, 12).map((ev) => (
                <div key={ev.id} className="px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-mono font-medium">{ev.name}</span>
                  <span className="text-muted-foreground">
                    {ev.entityType} · {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">
            {fa ? "دفتر مصرف و خطای هوش مصنوعی" : "AI Usage & Audit Ledger"}
          </h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {initialUsage.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground text-center flex flex-col items-center gap-2">
                <ShieldAlert className="size-4" />
                <span>{fa ? "هنوز فراخوانی AI ثبت نشده است." : "No AI invocations logged yet."}</span>
              </div>
            ) : (
              initialUsage.slice(0, 12).map((row) => (
                <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-mono font-medium">{row.model}</span>
                    {row.errorCode && (
                      <span className="ms-2 text-amber-700 font-mono">({row.errorCode})</span>
                    )}
                  </div>
                  <div className="text-muted-foreground tabular-nums">
                    {row.status} · {row.latencyMs ?? 0}ms
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
