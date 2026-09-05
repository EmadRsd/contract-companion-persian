import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileStack,
  FileText,
  MessagesSquare,
  PenLine,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { workspaceFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  contractStatusLabels,
  contractStatuses,
  daysUntil,
  faDate,
  faDateTime,
  faNumber,
  itemStateClasses,
  itemStateLabels,
  itemStates,
  roleLabels,
  type ItemState,
} from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Dashboard() {
  const { fullName, roles, userId } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const { contracts, items, approvals, signatures, audit, templates, commentCount } = data;

  const counts = itemStates.reduce<Record<ItemState, number>>(
    (acc, s) => ({ ...acc, [s]: items.filter((i) => i.state === s).length }),
    {} as Record<ItemState, number>,
  );
  const totalItems = items.length || 1;

  const expiring = contracts.filter((c) => {
    const d = daysUntil(c.end_date);
    return d !== null && d >= 0 && d <= (c.renewal_alert_days || 30);
  });
  const expired = contracts.filter((c) => {
    const d = daysUntil(c.end_date);
    return c.status === "expired" || (d !== null && d < 0);
  });
  const pendingApproval = approvals.filter((a) => a.status === "pending");
  const pendingSignature = contracts.filter(
    (c) => c.signature_date && !signatures.some((s) => s.contract_id === c.id),
  );
  const totalValue = contracts.reduce((s, c) => s + (c.value || 0), 0);

  const kpis = [
    { icon: FileText, label: "کل قراردادها", value: contracts.length },
    { icon: CheckCircle2, label: "قراردادهای جاری", value: contracts.filter((c) => c.status === "active").length },
    { icon: ShieldCheck, label: "در انتظار تأیید", value: pendingApproval.length },
    { icon: PenLine, label: "در انتظار امضا", value: pendingSignature.length },
    { icon: AlarmClock, label: "نزدیک به انقضا", value: expiring.length },
    { icon: FileStack, label: "منقضی‌شده", value: expired.length },
    { icon: ClipboardList, label: "پیش‌نویس", value: contracts.filter((c) => c.status === "draft").length },
    { icon: Wallet, label: "ارزش کل (ریال)", value: totalValue },
  ];

  const statusChart = contractStatuses
    .map((s) => ({ name: contractStatusLabels[s], value: contracts.filter((c) => c.status === s).length }))
    .filter((d) => d.value > 0);

  const buckets = [
    { label: "تا ۷ روز آینده", max: 7 },
    { label: "تا ۳۰ روز آینده", max: 30 },
    { label: "تا ۹۰ روز آینده", max: 90 },
  ].map((b, idx, arr) => {
    const min = idx === 0 ? 0 : arr[idx - 1]!.max;
    return {
      label: b.label,
      count: contracts.filter((c) => {
        const d = daysUntil(c.end_date);
        return d !== null && d > min - (idx === 0 ? 1 : 0) && d <= b.max;
      }).length,
    };
  });
  buckets.push({
    label: "بیش از ۹۰ روز",
    count: contracts.filter((c) => (daysUntil(c.end_date) ?? -1) > 90).length,
  });

  const myTasks = [
    ...approvals
      .filter((a) => a.user_id === userId && a.status === "pending")
      .map((a) => ({
        id: a.id,
        text: `تأیید مرحله ${faNumber(a.step)} قرارداد «${contracts.find((c) => c.id === a.contract_id)?.title ?? "—"}»`,
        contractId: a.contract_id,
      })),
    ...items
      .filter((i) => i.state === "in_review")
      .slice(0, 5)
      .map((i) => ({ id: i.id, text: `بازبینی بند «${i.title}»`, contractId: i.contract_id })),
    ...expiring.slice(0, 5).map((c) => ({
      id: `exp-${c.id}`,
      text: `قرارداد «${c.title}» تا ${faNumber(daysUntil(c.end_date) ?? 0)} روز دیگر منقضی می‌شود`,
      contractId: c.id,
    })),
  ].slice(0, 8);

  const quickActions = [
    { to: "/contracts" as const, label: "ایجاد قرارداد", icon: Plus },
    { to: "/templates" as const, label: "ساخت از قالب", icon: FileStack },
    { to: "/approvals" as const, label: "شروع/پیگیری تأیید", icon: ShieldCheck },
    { to: "/calendar" as const, label: "قراردادهای در حال انقضا", icon: AlarmClock },
    { to: "/tasks" as const, label: "کارهای من", icon: ClipboardList },
    { to: "/reports" as const, label: "گزارش‌ها", icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">سلام {fullName ?? ""} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نقش شما: {roles.length ? roles.map((r) => roleLabels[r]).join("، ") : "بدون نقش"} •{" "}
            {faNumber(templates.length)} قالب • {faNumber(commentCount)} گفتگو
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Button key={a.label} asChild variant="outline" size="sm">
            <Link to={a.to}>
              <a.icon className="size-4" /> {a.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((s) => (
          <div key={s.label} className="panel p-5">
            <s.icon className="size-5 text-primary" />
            <p className="mt-3 truncate text-2xl font-extrabold">{faNumber(s.value)}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-base font-bold">توزیع وضعیت قراردادها</h2>
          {statusChart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">داده‌ای موجود نیست.</p>
          ) : (
            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="text-base font-bold">زمان‌بندی انقضای قراردادها</h2>
          <div className="mt-5 space-y-4">
            {buckets.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="text-muted-foreground">{faNumber(b.count)}</span>
                </div>
                <Progress value={(b.count / (contracts.length || 1)) * 100} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">کارهای من</h2>
            <Link to="/tasks" className="text-sm text-primary hover:underline">
              مشاهده همه
            </Link>
          </div>
          <div className="space-y-2">
            {myTasks.map((t) => (
              <Link
                key={t.id}
                to="/contracts/$contractId"
                params={{ contractId: t.contractId }}
                className="flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/60"
              >
                <ClipboardList className="size-4 shrink-0 text-primary" />
                <span className="truncate">{t.text}</span>
              </Link>
            ))}
            {myTasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">کار بازی ندارید.</p>
            )}
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">فعالیت‌های اخیر</h2>
            <Link to="/audit" className="text-sm text-primary hover:underline">
              گزارش ممیزی
            </Link>
          </div>
          <ol className="space-y-3">
            {audit.slice(0, 8).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="truncate">{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.contract_title} • {faDateTime(a.created_at)}
                  </p>
                </div>
              </li>
            ))}
            {audit.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">فعالیتی ثبت نشده است.</p>
            )}
          </ol>
        </div>
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
              <Progress value={(counts[s] / totalItems) * 100} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
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

      <div className="panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">آخرین قراردادها</h2>
          <Link to="/contracts" className="text-sm text-primary hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="space-y-2">
          {contracts.slice(0, 6).map((c) => {
            const list = items.filter((i) => i.contract_id === c.id);
            const done = list.filter((i) => i.state === "done").length;
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
                    {faNumber(done)}/{faNumber(list.length)} بند
                  </span>
                  <Badge variant="outline">{contractStatusLabels[c.status]}</Badge>
                </div>
              </Link>
            );
          })}
          {contracts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز قراردادی ثبت نشده است.
            </p>
          )}
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MessagesSquare className="size-4" /> گفتگوی تیمی زیر هر بند قرارداد در صفحه همان قرارداد در
        دسترس است.
      </p>
    </div>
  );
}
