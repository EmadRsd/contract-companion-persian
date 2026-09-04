import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, ScrollText } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { faDateTime, faNumber } from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "گزارش ممیزی | سامانه CLM" },
      { name: "description", content: "ردگیری کامل تغییرات و اقدامات انجام‌شده روی قراردادها." },
      { property: "og:title", content: "گزارش ممیزی قراردادها" },
      { property: "og:description", content: "تاریخچه کامل اقدامات کاربران روی قراردادها." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });
  const [q, setQ] = useState("");
  const [userId, setUserId] = useState("all");

  if (isLoading || !data) return <Skeleton className="h-72 rounded-xl" />;

  const nameOf = (id: string) => data.users.find((u) => u.id === id)?.full_name ?? "—";
  const rows = data.audit.filter((a) => {
    const matchQ =
      !q.trim() ||
      a.action.includes(q.trim()) ||
      (a.contract_title ?? "").includes(q.trim()) ||
      nameOf(a.user_id).includes(q.trim());
    return matchQ && (userId === "all" || a.user_id === userId);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">گزارش ممیزی</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {faNumber(rows.length)} رویداد ثبت‌شده
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const csv = [
              ["زمان", "کاربر", "قرارداد", "اقدام"],
              ...rows.map((a) => [faDateTime(a.created_at), nameOf(a.user_id), a.contract_title ?? "", a.action]),
            ]
              .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
              .join("\n");
            const url = URL.createObjectURL(
              new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "audit-log.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="size-4" /> خروجی CSV
        </Button>
      </div>

      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="جستجو در اقدام‌ها، قراردادها و کاربران"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="کاربر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه کاربران</SelectItem>
              {data.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ScrollText className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">رویدادی مطابق فیلترها یافت نشد.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>زمان</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>قرارداد</TableHead>
                <TableHead>اقدام</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {faDateTime(a.created_at)}
                  </TableCell>
                  <TableCell>{nameOf(a.user_id)}</TableCell>
                  <TableCell>{a.contract_title}</TableCell>
                  <TableCell>{a.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
