import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileArchive, Search } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { faDateTime, faNumber } from "@/lib/clm";
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

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "اسناد و پیوست‌ها | سامانه CLM کانکت شریف" },
      {
        name: "description",
        content: "همه فایل‌ها و تصاویر پیوست‌شده به قراردادها در یک فهرست قابل جست‌وجو.",
      },
      { property: "og:title", content: "اسناد و پیوست‌ها | سامانه CLM" },
      {
        property: "og:description",
        content: "مرور اسناد قراردادی سازمان همراه با اندازه، نوع و تاریخ بارگذاری.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Documents,
});

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${faNumber(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${faNumber(Math.round(bytes / 1024))} کیلوبایت`;
  return `${faNumber(Math.round((bytes / 1024 / 1024) * 10) / 10)} مگابایت`;
}

function Documents() {
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });
  const [q, setQ] = useState("");

  const users = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u.full_name || u.username])),
    [data],
  );

  const rows = useMemo(() => {
    const term = q.trim();
    const list = data?.attachments ?? [];
    return term
      ? list.filter((a) => a.name.includes(term) || (a.contract_title ?? "").includes(term))
      : list;
  }, [data, q]);

  const totalSize = (data?.attachments ?? []).reduce((s, a) => s + (a.size ?? 0), 0);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">اسناد و پیوست‌ها</h1>
          <p className="text-sm text-muted-foreground">
            {faNumber(data?.attachments.length ?? 0)} سند • مجموع {sizeLabel(totalSize)}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجوی سند یا قرارداد…"
            className="pr-9"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <FileArchive className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              هنوز سندی بارگذاری نشده است. از صفحه هر قرارداد می‌توانید فایل پیوست کنید.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">فهرست اسناد</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام سند</TableHead>
                  <TableHead>قرارداد</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>حجم</TableHead>
                  <TableHead>بارگذاری‌کننده</TableHead>
                  <TableHead>تاریخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[220px] truncate font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Link
                        to="/contracts/$contractId"
                        params={{ contractId: a.contract_id }}
                        className="text-primary hover:underline"
                      >
                        {a.contract_title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {a.content_type || "نامشخص"}
                      </Badge>
                    </TableCell>
                    <TableCell>{sizeLabel(a.size ?? 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {users.get(a.uploaded_by) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {faDateTime(a.created_at)}
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
