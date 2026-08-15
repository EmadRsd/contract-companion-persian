import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  contractStatusLabels,
  contractStatuses,
  faDate,
  faNumber,
  permissions,
  type ContractStatus,
} from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/contracts/")({
  head: () => ({
    meta: [
      { title: "قراردادها | سامانه مدیریت قرارداد" },
      { name: "description", content: "فهرست قراردادها، وضعیت و پیشرفت بندهای هر قرارداد." },
      { property: "og:title", content: "فهرست قراردادها" },
      { property: "og:description", content: "فهرست قراردادها، وضعیت و پیشرفت بندهای هر قرارداد." },
    ],
  }),
  component: ContractsPage,
});

function ContractsPage() {
  const { userId, roles } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    counterparty: "",
    description: "",
    value: "",
    start_date: "",
    end_date: "",
    status: "draft" as ContractStatus,
  });

  const canManage = permissions.canManageContracts(roles);

  const { data, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const [contracts, items] = await Promise.all([
        supabase.from("contracts").select("*").order("created_at", { ascending: false }),
        supabase.from("contract_items").select("id, contract_id, state"),
      ]);
      if (contracts.error) throw contracts.error;
      return { contracts: contracts.data ?? [], items: items.data ?? [] };
    },
  });

  const createContract = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("no user");
      const { error } = await supabase.from("contracts").insert({
        title: form.title,
        counterparty: form.counterparty,
        description: form.description,
        value: form.value ? Number(form.value) : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("قرارداد ایجاد شد");
      setOpen(false);
      setForm({
        title: "",
        counterparty: "",
        description: "",
        value: "",
        start_date: "",
        end_date: "",
        status: "draft",
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => toast.error("ثبت نشد: " + e.message),
  });

  const contracts = (data?.contracts ?? []).filter((c) => {
    const matchesSearch =
      !search ||
      c.title.includes(search) ||
      c.counterparty.includes(search) ||
      c.description.includes(search);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">قراردادها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {faNumber(contracts.length)} قرارداد نمایش داده می‌شود
          </p>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                قرارداد جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>ثبت قرارداد جدید</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>عنوان قرارداد</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>طرف قرارداد</Label>
                  <Input
                    value={form.counterparty}
                    onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>متن یا خلاصه قرارداد</Label>
                  <Textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>مبلغ (ریال)</Label>
                    <Input
                      type="number"
                      dir="ltr"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>وضعیت</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as ContractStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contractStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {contractStatusLabels[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>تاریخ شروع</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>تاریخ پایان</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createContract.mutate()}
                  disabled={!form.title || createContract.isPending}
                >
                  ثبت قرارداد
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="جستجو در قراردادها…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {contractStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {contractStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted-foreground">
          قراردادی یافت نشد.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {contracts.map((c) => {
            const items = (data?.items ?? []).filter((i) => i.contract_id === c.id);
            const done = items.filter((i) => i.state === "done").length;
            return (
              <Link
                key={c.id}
                to="/contracts/$contractId"
                params={{ contractId: c.id }}
                className="panel block p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold">{c.title}</h2>
                  <Badge variant="outline">{contractStatusLabels[c.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  طرف قرارداد: {c.counterparty || "—"}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {c.description || "بدون توضیح"}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {faNumber(done)} از {faNumber(items.length)} بند انجام شده
                  </span>
                  <span>پایان: {faDate(c.end_date)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
