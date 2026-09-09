import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { createContractFn, type ContractFormInput } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  cities,
  contractCategories,
  contractStatusLabels,
  contractStatuses,
  departments,
  faNumber,
  permissions,
  type ContractStatus,
} from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contracts/new")({
  head: () => ({
    meta: [
      { title: "ایجاد قرارداد جدید | گروه کانکت شریف" },
      {
        name: "description",
        content: "ساخت گام‌به‌گام قرارداد: اطلاعات پایه، دسته‌بندی، تاریخ‌ها و بازبینی نهایی.",
      },
      { property: "og:title", content: "ایجاد قرارداد جدید" },
      {
        property: "og:description",
        content: "ساخت گام‌به‌گام قرارداد در سامانه مدیریت چرخه عمر قرارداد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewContractWizard,
});

const steps = ["اطلاعات پایه", "دسته‌بندی و مالکیت", "تاریخ‌ها و هشدارها", "بازبینی و ثبت"];

function NewContractWizard() {
  const { roles, city: userCity, department: userDept } = useAuth();
  const navigate = useNavigate();
  const canManage = permissions.canManageContracts(roles);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    counterparty: "",
    description: "",
    value: "",
    city: userCity || "",
    department: userDept || "",
    category: contractCategories[0] ?? "سایر",
    tags: "",
    start_date: "",
    end_date: "",
    signature_date: "",
    renewal_alert_days: "30",
    status: "draft" as ContractStatus,
    is_template: false,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const tags = form.tags
    .split("،")
    .flatMap((t) => t.split(","))
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = (): ContractFormInput => ({
    title: form.title.trim(),
    counterparty: form.counterparty.trim(),
    description: form.description,
    value: form.value ? Number(form.value) : 0,
    city: form.city || userCity || "",
    department: form.department,
    category: form.category,
    tags,
    assignees: [],
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    signature_date: form.signature_date || null,
    renewal_alert_days: Number(form.renewal_alert_days) || 30,
    status: form.status,
    is_template: form.is_template,
  });

  const create = useMutation({
    mutationFn: () => createContractFn({ data: payload() }),
    onSuccess: (res: unknown) => {
      toast.success(form.is_template ? "قالب ذخیره شد" : "قرارداد ایجاد شد");
      const id = (res as { id?: string } | null)?.id;
      if (id) navigate({ to: "/contracts/$contractId", params: { contractId: id } });
      else navigate({ to: "/contracts" });
    },
    onError: (e: Error) => toast.error("ثبت نشد: " + e.message),
  });

  const stepValid =
    step === 0
      ? form.title.trim().length > 1 && form.counterparty.trim().length > 1
      : step === 1
        ? Boolean(form.city && form.department)
        : true;

  if (!canManage) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-muted-foreground">شما اجازه ایجاد قرارداد ندارید.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">ایجاد قرارداد جدید</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            گام {faNumber(step + 1)} از {faNumber(steps.length)} — {steps[step]}
          </p>
        </div>
        <Button asChild variant="ghost" className="gap-1">
          <Link to="/contracts">
            <ArrowRight className="size-4" /> بازگشت
          </Link>
        </Button>
      </div>

      <ol className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              i === step
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : i < step
                  ? "border-state-done/40 bg-state-done/10 text-state-done"
                  : "text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-3.5" /> : <span>{faNumber(i + 1)}</span>}
            {s}
          </li>
        ))}
      </ol>

      <div className="panel space-y-4 p-6">
        {step === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>عنوان قرارداد</Label>
                <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>طرف قرارداد</Label>
                <Input
                  value={form.counterparty}
                  onChange={(e) => set({ counterparty: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>متن یا خلاصه قرارداد</Label>
              <Textarea
                rows={7}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="هر پاراگراف بعداً می‌تواند به یک بند قابل بحث تبدیل شود."
              />
            </div>
          </>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>شهر</Label>
              <Select value={form.city} onValueChange={(v) => set({ city: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب شهر" />
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
            <div className="space-y-1.5">
              <Label>واحد سازمانی</Label>
              <Select value={form.department} onValueChange={(v) => set({ department: v })}>
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
              <Select value={form.category} onValueChange={(v) => set({ category: v })}>
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
              <Label>مبلغ (ریال)</Label>
              <Input
                type="number"
                dir="ltr"
                value={form.value}
                onChange={(e) => set({ value: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>برچسب‌ها (با ، جدا کنید)</Label>
              <Input value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>تاریخ شروع</Label>
              <Input
                type="date"
                dir="ltr"
                value={form.start_date}
                onChange={(e) => set({ start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>تاریخ پایان</Label>
              <Input
                type="date"
                dir="ltr"
                value={form.end_date}
                onChange={(e) => set({ end_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>تاریخ امضا</Label>
              <Input
                type="date"
                dir="ltr"
                value={form.signature_date}
                onChange={(e) => set({ signature_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>هشدار تمدید (روز قبل از پایان)</Label>
              <Input
                type="number"
                dir="ltr"
                value={form.renewal_alert_days}
                onChange={(e) => set({ renewal_alert_days: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>وضعیت</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set({ status: v as ContractStatus })}
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
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">ذخیره به عنوان قالب</p>
                <p className="text-xs text-muted-foreground">
                  قالب‌ها برای ساخت سریع قراردادهای مشابه استفاده می‌شوند.
                </p>
              </div>
              <Switch
                checked={form.is_template}
                onCheckedChange={(v) => set({ is_template: v })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="عنوان" value={form.title} />
            <Row label="طرف قرارداد" value={form.counterparty} />
            <Row label="شهر" value={form.city} />
            <Row label="واحد" value={form.department} />
            <Row label="دسته‌بندی" value={form.category} />
            <Row label="مبلغ" value={form.value ? `${faNumber(Number(form.value))} ریال` : "—"} />
            <Row label="شروع" value={form.start_date || "—"} />
            <Row label="پایان" value={form.end_date || "—"} />
            <Row label="وضعیت" value={contractStatusLabels[form.status]} />
            <Row
              label="هشدار تمدید"
              value={`${faNumber(Number(form.renewal_alert_days) || 30)} روز`}
            />
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">برچسب‌ها</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {tags.length ? (
                  tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="gap-1"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowRight className="size-4" /> مرحله قبل
        </Button>

        {step < steps.length - 1 ? (
          <Button className="gap-1" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            مرحله بعد <ArrowLeft className="size-4" />
          </Button>
        ) : (
          <Button className="gap-1" disabled={create.isPending} onClick={() => create.mutate()}>
            <Check className="size-4" /> ثبت نهایی
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || "—"}</dd>
    </div>
  );
}
