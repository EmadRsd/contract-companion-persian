import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { contractStatusLabels, faDate, faNumber } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/counterparties")({
  head: () => ({
    meta: [
      { title: "طرف‌های قرارداد | سامانه CLM کانکت شریف" },
      {
        name: "description",
        content: "فهرست طرف‌های قرارداد، تعداد و ارزش قراردادهای هر طرف و وضعیت آن‌ها.",
      },
      { property: "og:title", content: "طرف‌های قرارداد | سامانه CLM" },
      {
        property: "og:description",
        content: "مدیریت و بررسی طرف‌های قرارداد سازمان در سامانه CLM کانکت شریف.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Counterparties,
});

function Counterparties() {
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        count: number;
        value: number;
        active: number;
        cities: Set<string>;
        last: string | null;
        contracts: { id: string; title: string; status: string }[];
      }
    >();
    for (const c of data?.contracts ?? []) {
      const name = c.counterparty?.trim() || "بدون نام";
      const entry = map.get(name) ?? {
        name,
        count: 0,
        value: 0,
        active: 0,
        cities: new Set<string>(),
        last: null as string | null,
        contracts: [] as { id: string; title: string; status: string }[],
      };
      entry.count += 1;
      entry.value += c.value ?? 0;
      if (c.status === "active") entry.active += 1;
      if (c.city) entry.cities.add(c.city);
      if (!entry.last || c.updated_at > entry.last) entry.last = c.updated_at;
      entry.contracts.push({ id: c.id, title: c.title, status: c.status });
      map.set(name, entry);
    }
    const list = [...map.values()].sort((a, b) => b.value - a.value);
    const term = q.trim();
    return term ? list.filter((r) => r.name.includes(term)) : list;
  }, [data, q]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">طرف‌های قرارداد</h1>
          <p className="text-sm text-muted-foreground">
            {faNumber(rows.length)} طرف قرارداد در محدوده دسترسی شما
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجوی طرف قرارداد…"
            className="pr-9"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">طرف قراردادی یافت نشد.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">فهرست طرف‌ها</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>طرف قرارداد</TableHead>
                  <TableHead>تعداد قرارداد</TableHead>
                  <TableHead>جاری</TableHead>
                  <TableHead>ارزش کل (ریال)</TableHead>
                  <TableHead>شهرها</TableHead>
                  <TableHead>آخرین به‌روزرسانی</TableHead>
                  <TableHead>قراردادها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{faNumber(r.count)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{faNumber(r.active)}</Badge>
                    </TableCell>
                    <TableCell>{faNumber(r.value)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[...r.cities].join("، ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {faDate(r.last)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.contracts.slice(0, 3).map((c) => (
                          <Link
                            key={c.id}
                            to="/contracts/$contractId"
                            params={{ contractId: c.id }}
                            className="rounded-md border px-2 py-0.5 text-[11px] hover:bg-accent"
                            title={contractStatusLabels[
                              c.status as keyof typeof contractStatusLabels
                            ]}
                          >
                            {c.title}
                          </Link>
                        ))}
                        {r.contracts.length > 3 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{faNumber(r.contracts.length - 3)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
