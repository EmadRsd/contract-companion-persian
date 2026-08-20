import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutTemplate, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  createContractFn,
  createFromTemplateFn,
  listContractsFn,
  listTemplatesFn,
  type ContractFormInput,
} from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  cities,
  contractCategories,
  contractStatusLabels,
  contractStatuses,
  daysUntil,
  departments,
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
import { Switch } from "@/components/ui/switch";
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
      { title: "قراردادها | گروه کانکت شریف" },
      { name: "description", content: "فهرست قراردادها به تفکیک شهر، دسته‌بندی و وضعیت." },
      { property: "og:title", content: "فهرست قراردادها" },
      {
        property: "og:description",
        content: "فهرست قراردادها به تفکیک شهر، دسته‌بندی و وضعیت.",
      },
    ],
  }),
  component: ContractsPage,
});

const emptyForm = {
  title: "",
  counterparty: "",
  description: "",
  value: "",
  city: "",
  department: "",
  category: contractCategories[0] ?? "سایر",
  tags: "",
  start_date: "",
  end_date: "",
  signature_date: "",
  renewal_alert_days: "30",
  status: "draft" as ContractStatus,
  is_template: false,
};

function ContractsPage() {
  const { roles, city: userCity } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState({ templateId: "", title: "", counterparty: "", city: "" });
  const [form, setForm] = useState(emptyForm);

  const canManage = permissions.canManageContracts(roles);

  const { data, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => listContractsFn(),
  });

  const { data: templateData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplatesFn(),
    enabled: canManage,
  });

  const payload = (): ContractFormInput => ({
    title: form.title,
    counterparty: form.counterparty,
    description: form.description,
    value: form.value ? Number(form.value) : 0,
    city: form.city || userCity || "",
    department: form.department,
    category: form.category,
    tags: form.tags
      .split("،")
      .flatMap((t) => t.split(","))
      .map((t) => t.trim())
      .filter(Boolean),
    assignees: [],
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    signature_date: form.signature_date || null,
    renewal_alert_days: Number(form.renewal_alert_days) || 30,
    status: form.status,
    is_template: form.is_template,
  });

  const createContract = useMutation({
    mutationFn: () => createContractFn({ data: payload() }),
    onSuccess: () => {
      toast.success(form.is_template ? "قالب ذخیره شد" : "قرارداد ایجاد شد");
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: Error) => toast.error("ثبت نشد: " + e.message),
  });

  const fromTemplate = useMutation({
    mutationFn: () =>
      createFromTemplateFn({
        data: {
          templateId: tplForm.templateId,
          title: tplForm.title,
          counterparty: tplForm.counterparty,
          city: tplForm.city || userCity || "",
        },
      }),
    onSuccess: () => {
      toast.success("قرارداد از روی قالب ساخته شد");
      setTplOpen(false);
      setTplForm({ templateId: "", title: "", counterparty: "", city: "" });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => toast.error("ثبت نشد: " + e.message),
  });

  const contracts = (data?.contracts ?? []).filter((c) => {
    const q = search.trim();
    const matchesSearch =
      !q ||
      c.title.includes(q) ||
      c.counterparty.includes(q) ||
      c.description.includes(q) ||
      c.tags.some((t) => t.includes(q));
    return (
      matchesSearch &&
      (statusFilter === "all" || c.status === statusFilter) &&
      (cityFilter === "all" || c.city === cityFilter) &&
      (categoryFilter === "all" || c.category === categoryFilter)
    );
  });

  const cityOptions = Array.from(
    new Set([...cities, ...(data?.contracts ?? []).map((c) => c.city).filter(Boolean)]),
  );

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setTplOpen(true)}>
              <LayoutTemplate className="size-4" />
              ایجاد از قالب
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="size-4" />
                  قرارداد جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>ثبت قرارداد جدید</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
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
                  </div>
                  <div className="space-y-1.5">
                    <Label>متن یا خلاصه قرارداد</Label>
                    <Textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>شهر</Label>
                      <Select
                        value={form.city || userCity || ""}
                        onValueChange={(v) => setForm({ ...form, city: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب شهر" />
                        </SelectTrigger>
                        <SelectContent>
                          {cityOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>واحد سازمانی</Label>
                      <Select
                        value={form.department}
                        onValueChange={(v) => setForm({ ...form, department: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب واحد" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>دسته‌بندی</Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {contractCategories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>برچسب‌ها (با ، جدا کنید)</Label>
                      <Input
                        value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      />
                    </div>
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
                    <div className="space-y-1.5">
                      <Label>تاریخ امضا</Label>
                      <Input
                        type="date"
                        dir="ltr"
                        value={form.signature_date}
                        onChange={(e) => setForm({ ...form, signature_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>هشدار تمدید (روز قبل از پایان)</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={form.renewal_alert_days}
                        onChange={(e) => setForm({ ...form, renewal_alert_days: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-semibold">ذخیره به‌عنوان قالب</p>
                      <p className="text-xs text-muted-foreground">
                        قالب‌ها در فهرست قراردادها نمایش داده نمی‌شوند.
                      </p>
                    </div>
                    <Switch
                      checked={form.is_template}
                      onCheckedChange={(v) => setForm({ ...form, is_template: v })}
                    />
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
          </div>
        )}
      </div>

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ایجاد قرارداد از روی قالب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>قالب</Label>
              <Select
                value={tplForm.templateId}
                onValueChange={(v) => setTplForm({ ...tplForm, templateId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب قالب" />
                </SelectTrigger>
                <SelectContent>
                  {(templateData?.templates ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>عنوان قرارداد جدید</Label>
              <Input
                value={tplForm.title}
                onChange={(e) => setTplForm({ ...tplForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>طرف قرارداد</Label>
              <Input
                value={tplForm.counterparty}
                onChange={(e) => setTplForm({ ...tplForm, counterparty: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>شهر</Label>
              <Select
                value={tplForm.city || userCity || ""}
                onValueChange={(v) => setTplForm({ ...tplForm, city: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب شهر" />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => (
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
              onClick={() => fromTemplate.mutate()}
              disabled={!tplForm.templateId || fromTemplate.isPending}
            >
              ایجاد قرارداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه شهرها</SelectItem>
            {cityOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌ها</SelectItem>
            {contractCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-40">
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
            const remaining = daysUntil(c.end_date);
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
                  {c.city || "—"} • {c.category || "بدون دسته"} • طرف قرارداد:{" "}
                  {c.counterparty || "—"}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {c.description || "بدون توضیح"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {faNumber(done)} از {faNumber(items.length)} بند انجام شده
                  </span>
                  <span>پایان: {faDate(c.end_date)}</span>
                </div>
                {remaining !== null && remaining <= c.renewal_alert_days && (
                  <p className="mt-2 text-xs font-semibold text-state-review">
                    {remaining >= 0
                      ? `${faNumber(remaining)} روز تا پایان قرارداد`
                      : "قرارداد منقضی شده است"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
