import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, ListChecks, MessagesSquare, Clock } from "lucide-react";
import { dashboardFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  contractStatusLabels,
  faDate,
  faNumber,
  itemStateLabels,
  itemStates,
  itemStateClasses,
  roleLabels,
  type ItemState,
} from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "داشبورد | سامانه مدیریت قرارداد" },
      { name: "description", content: "نمای کلی قراردادها، وضعیت بندها و فعالیت‌های اخیر." },
      { property: "og:title", content: "داشبورد سامانه مدیریت قرارداد" },
      { property: "og:description", content: "نمای کلی قراردادها، وضعیت بندها و فعالیت‌های اخیر." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { fullName, roles } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardFn(),
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const counts = itemStates.reduce<Record<ItemState, number>>(
    (acc, s) => ({ ...acc, [s]: data.items.filter((i) => i.state === s).length }),
    {} as Record<ItemState, number>,
  );
  const total = data.items.length || 1;

  const stats = [
    { icon: FileText, label: "قراردادها", value: data.contracts.length },
    { icon: ListChecks, label: "بندها", value: data.items.length },
    { icon: MessagesSquare, label: "گفتگوها", value: data.commentCount },
    {
      icon: Clock,
      label: "قراردادهای جاری",
      value: data.contracts.filter((c) => c.status === "active").length,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">سلام {fullName ?? ""} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نقش شما: {roles.length ? roles.map((r) => roleLabels[r]).join("، ") : "بدون نقش"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <s.icon className="size-5 text-primary" />
            <p className="mt-3 text-2xl font-extrabold">{faNumber(s.value)}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-bold">وضعیت کلی بندها</h2>
        <div className="mt-5 space-y-4">
          {itemStates.map((s) => (
            <div key={s}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>{itemStateLabels[s]}</span>
                <span className="text-muted-foreground">{faNumber(counts[s])}</span>
              </div>
              <Progress value={(counts[s] / total) * 100} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">آخرین قراردادها</h2>
          <Link to="/contracts" className="text-sm text-primary hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="space-y-2">
          {data.contracts.slice(0, 6).map((c) => {
            const items = data.items.filter((i) => i.contract_id === c.id);
            const done = items.filter((i) => i.state === "done").length;
            return (
              <Link
                key={c.id}
                to="/contracts/$contractId"
                params={{ contractId: c.id }}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.counterparty || "بدون طرف قرارداد"} • {faDate(c.end_date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {faNumber(done)}/{faNumber(items.length)} بند
                  </span>
                  <Badge variant="outline">{contractStatusLabels[c.status]}</Badge>
                </div>
              </Link>
            );
          })}
          {data.contracts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز قراردادی ثبت نشده است.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {itemStates.map((s) => (
          <span
            key={s}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", itemStateClasses[s])}
          >
            {itemStateLabels[s]}: {faNumber(counts[s])}
          </span>
        ))}
      </div>
    </div>
  );
}
