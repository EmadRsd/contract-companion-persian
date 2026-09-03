import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileStack, Plus } from "lucide-react";
import { toast } from "sonner";
import { createFromTemplateFn, workspaceFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import { cities, faDate, faNumber, permissions } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "قالب‌های قرارداد | سامانه CLM" },
      { name: "description", content: "مدیریت قالب‌های آماده قرارداد و ساخت قرارداد از روی قالب." },
      { property: "og:title", content: "قالب‌های قرارداد" },
      { property: "og:description", content: "مدیریت قالب‌های آماده قرارداد." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { roles, city } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", counterparty: "", city: city || cities[0]! });

  const create = useMutation({
    mutationFn: () =>
      createFromTemplateFn({ data: { templateId: templateId!, ...form } }),
    onSuccess: (res: { id: string }) => {
      toast.success("قرارداد از روی قالب ساخته شد");
      setTemplateId(null);
      queryClient.invalidateQueries();
      navigate({ to: "/contracts/$contractId", params: { contractId: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <Skeleton className="h-64 rounded-xl" />;

  const canManage = permissions.canManageContracts(roles);
  const usage = (id: string) => data.contracts.filter((c) => c.category && c.title.includes(id)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">قالب‌های قرارداد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قالب‌های آماده برای ایجاد سریع قراردادهای پرتکرار
          </p>
        </div>
        {canManage && (
          <Button onClick={() => navigate({ to: "/contracts" })}>
            <Plus className="size-4" /> ساخت قالب جدید
          </Button>
        )}
      </div>

      {data.templates.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <FileStack className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            هنوز قالبی ثبت نشده است. در صفحه قراردادها هنگام ایجاد، گزینه «ذخیره به عنوان قالب» را
            فعال کنید.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.templates.map((t) => (
            <div key={t.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold">{t.title}</h2>
                <Badge variant="outline">{t.category || "بدون دسته"}</Badge>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {t.description || "بدون توضیح"}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>واحد: {t.department || "—"}</div>
                <div>نسخه: {faNumber(t.version)}</div>
                <div>شهر: {t.city || "—"}</div>
                <div>به‌روزرسانی: {faDate(t.updated_at)}</div>
                <div>دفعات استفاده: {faNumber(usage(t.title))}</div>
              </dl>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-auto"
                  onClick={() => {
                    setTemplateId(t.id);
                    setForm({ title: t.title, counterparty: "", city: city || t.city || cities[0]! });
                  }}
                >
                  ساخت قرارداد از این قالب
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!templateId} onOpenChange={(o) => !o && setTemplateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ساخت قرارداد از قالب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>عنوان قرارداد</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>طرف قرارداد</Label>
              <Input
                value={form.counterparty}
                onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
              />
            </div>
            <div>
              <Label>شهر</Label>
              <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.title.trim()}
            >
              ایجاد قرارداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
