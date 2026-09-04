import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { workspaceFn } from "@/lib/api.functions";
import {
  contractStatusLabels,
  contractStatuses,
  daysUntil,
  faNumber,
  type ContractStatus,
} from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "گزارش‌ها و تحلیل | سامانه CLM" },
      { name: "description", content: "تحلیل مالی، وضعیتی و ریسک قراردادها با امکان خروجی CSV." },
      { property: "og:title", content: "گزارش‌ها و تحلیل قراردادها" },
      { property: "og:description", content: "نمودارها و شاخص‌های کلیدی قراردادها." },
    ],
  }),
  component: ReportsPage,
});

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function download(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });
  if (isLoading || !data) return <Skeleton className="h-72 rounded-xl" />;

  const { contracts, users } = data;
  const totalValue = contracts.reduce((s, c) => s + (c.value || 0), 0);
  const activeValue = contracts
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + (c.value || 0), 0);

  const byStatus = contractStatuses.map((s) => ({
    name: contractStatusLabels[s as ContractStatus],
    value: contracts.filter((c) => c.status === s).length,
  }));

  const deptMap = new Map<string, { count: number; value: number }>();
  for (const c of contracts) {
    const key = c.department || "بدون واحد";
    const cur = deptMap.get(key) ?? { count: 0, value: 0 };
    deptMap.set(key, { count: cur.count + 1, value: cur.value + (c.value || 0) });
  }
  const byDept = [...deptMap.entries()].map(([name, v]) => ({ name, ...v }));

  const cpMap = new Map<string, { count: number; value: number }>();
  for (const c of contracts) {
    const key = c.counterparty || "نامشخص";
    const cur = cpMap.get(key) ?? { count: 0, value: 0 };
    cpMap.set(key, { count: cur.count + 1, value: cur.value + (c.value || 0) });
  }
  const byCounterparty = [...cpMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const risky = contracts.filter(
    (c) => !c.end_date || (daysUntil(c.end_date) ?? 999) <= 30 || c.value >= 5_000_000_000,
  );

  const kpis = [
    { label: "کل قراردادها", value: faNumber(contracts.length) },
    { label: "قراردادهای جاری", value: faNumber(contracts.filter((c) => c.status === "active").length) },
    { label: "ارزش کل (ریال)", value: faNumber(totalValue) },
    { label: "ارزش قراردادهای جاری (ریال)", value: faNumber(activeValue) },
    { label: "کاربران فعال", value: faNumber(users.length) },
    { label: "قراردادهای پرریسک", value: faNumber(risky.length) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">گزارش‌ها و تحلیل</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            شاخص‌های کلیدی، تحلیل مالی و ریسک قراردادها
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            download("contracts.csv", [
              ["عنوان", "طرف قرارداد", "وضعیت", "شهر", "واحد", "ارزش", "شروع", "پایان"],
              ...contracts.map((c) => [
                c.title,
                c.counterparty,
                contractStatusLabels[c.status],
                c.city,
                c.department,
                c.value,
                c.start_date ?? "",
                c.end_date ?? "",
              ]),
            ])
          }
        >
          <Download className="size-4" /> خروجی CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-5">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-2 text-xl font-extrabold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-bold">توزیع وضعیت قراردادها</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-bold">ارزش قرارداد به تفکیک واحد</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-bold">برترین طرف‌های قرارداد</h2>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>طرف قرارداد</TableHead>
              <TableHead>تعداد قرارداد</TableHead>
              <TableHead>ارزش کل (ریال)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byCounterparty.map((r) => (
              <TableRow key={r.name}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{faNumber(r.count)}</TableCell>
                <TableCell>{faNumber(r.value)}</TableCell>
              </TableRow>
            ))}
            {byCounterparty.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  داده‌ای موجود نیست.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-bold">قراردادهای پرریسک</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          نبود تاریخ پایان، نزدیکی به انقضا یا ارزش بسیار بالا
        </p>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>عنوان</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>ارزش</TableHead>
              <TableHead>روز مانده</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risky.map((c) => {
              const d = daysUntil(c.end_date);
              return (
                <TableRow key={c.id}>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{contractStatusLabels[c.status]}</TableCell>
                  <TableCell>{faNumber(c.value)}</TableCell>
                  <TableCell>{d === null ? "بدون تاریخ" : faNumber(d)}</TableCell>
                </TableRow>
              );
            })}
            {risky.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  ریسکی شناسایی نشد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
