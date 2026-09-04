import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import { daysUntil, faDate, faNumber, itemStateLabels } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "کارهای من | سامانه CLM" },
      { name: "description", content: "فهرست بازبینی‌ها، تأییدها و قراردادهای نیازمند اقدام شما." },
      { property: "og:title", content: "کارهای من" },
      { property: "og:description", content: "بازبینی‌ها، تأییدها و اقدامات در انتظار شما." },
    ],
  }),
  component: TasksPage,
});

type Priority = "low" | "medium" | "high" | "critical";

const priorityLabels: Record<Priority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  critical: "بحرانی",
};

const priorityClasses: Record<Priority, string> = {
  low: "border-state-todo/40 text-state-todo",
  medium: "border-state-progress/40 text-state-progress",
  high: "border-state-review/50 text-state-review",
  critical: "border-destructive/50 text-destructive",
};

interface Task {
  id: string;
  contractId: string;
  contract: string;
  type: string;
  due: string | null;
  priority: Priority;
  status: string;
}

function TasksPage() {
  const { userId } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });

  if (isLoading || !data) return <Skeleton className="h-72 rounded-xl" />;

  const titleOf = (id: string) => data.contracts.find((c) => c.id === id)?.title ?? "—";

  const approvals: Task[] = data.approvals
    .filter((a) => a.user_id === userId && a.status === "pending")
    .map((a) => ({
      id: a.id,
      contractId: a.contract_id,
      contract: titleOf(a.contract_id),
      type: `تأیید مرحله ${faNumber(a.step)}`,
      due: null,
      priority: "high",
      status: "در انتظار تأیید",
    }));

  const reviews: Task[] = data.items
    .filter((i) => i.state === "in_review")
    .filter((i) => data.contracts.some((c) => c.id === i.contract_id))
    .map((i) => ({
      id: i.id,
      contractId: i.contract_id,
      contract: titleOf(i.contract_id),
      type: `بازبینی بند: ${i.title}`,
      due: null,
      priority: "medium",
      status: itemStateLabels[i.state],
    }));

  const expiring: Task[] = data.contracts
    .filter((c) => {
      const d = daysUntil(c.end_date);
      return d !== null && d >= 0 && d <= (c.renewal_alert_days || 30);
    })
    .map((c) => ({
      id: `exp-${c.id}`,
      contractId: c.id,
      contract: c.title,
      type: "نزدیک شدن به انقضا / تمدید",
      due: c.end_date,
      priority: (daysUntil(c.end_date) ?? 99) <= 7 ? "critical" : "high",
      status: `${faNumber(daysUntil(c.end_date) ?? 0)} روز مانده`,
    }));

  const missing: Task[] = data.contracts
    .filter((c) => !c.end_date || !c.counterparty || !c.category || c.value <= 0)
    .map((c) => ({
      id: `meta-${c.id}`,
      contractId: c.id,
      contract: c.title,
      type: "تکمیل اطلاعات ناقص قرارداد",
      due: null,
      priority: "low",
      status: "اطلاعات ناقص",
    }));

  const signatures: Task[] = data.contracts
    .filter(
      (c) =>
        c.status === "draft" &&
        data.approvals.filter((a) => a.contract_id === c.id).every((a) => a.status === "approved") &&
        data.approvals.some((a) => a.contract_id === c.id) &&
        !data.signatures.some((s) => s.contract_id === c.id),
    )
    .map((c) => ({
      id: `sign-${c.id}`,
      contractId: c.id,
      contract: c.title,
      type: "آماده امضا",
      due: c.signature_date,
      priority: "high",
      status: "در انتظار امضا",
    }));

  const groups = [
    { key: "all", label: "همه", tasks: [...approvals, ...reviews, ...signatures, ...expiring, ...missing] },
    { key: "approvals", label: "تأییدها", tasks: approvals },
    { key: "reviews", label: "بازبینی‌ها", tasks: reviews },
    { key: "signatures", label: "امضاها", tasks: signatures },
    { key: "expiring", label: "در حال انقضا", tasks: expiring },
    { key: "missing", label: "اطلاعات ناقص", tasks: missing },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">کارهای من</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          اقدامات باز روی قراردادهای در دسترس شما
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          {groups.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.label} ({faNumber(g.tasks.length)})
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((g) => (
          <TabsContent key={g.key} value={g.key} className="mt-4">
            {g.tasks.length === 0 ? (
              <div className="panel flex flex-col items-center gap-2 p-12 text-center">
                <CheckCircle2 className="size-7 text-state-done" />
                <p className="text-sm text-muted-foreground">کار بازی در این دسته ندارید.</p>
              </div>
            ) : (
              <div className="panel divide-y">
                {g.tasks.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                    <ClipboardList className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.contract} • {t.status}
                        {t.due ? ` • مهلت: ${faDate(t.due)}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={priorityClasses[t.priority]}>
                      {priorityLabels[t.priority]}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/contracts/$contractId" params={{ contractId: t.contractId }}>
                        باز کردن قرارداد
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
