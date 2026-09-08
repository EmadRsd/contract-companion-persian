import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, PenLine, Plus, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  addAttachmentFn,
  decideApprovalFn,
  deleteAttachmentFn,
  setApprovalFlowFn,
  signContractFn,
} from "@/lib/api.functions";
import { approvalStatusLabels, faDateTime, faNumber } from "@/lib/clm";
import type { ApprovalDTO, AttachmentDTO, SignatureDTO, UserDTO, VersionDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_SIZE = 5 * 1024 * 1024;

const statusTone: Record<string, string> = {
  pending: "bg-state-progress/12 text-state-progress border-state-progress/30",
  approved: "bg-state-done/12 text-state-done border-state-done/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

export interface ContractWorkflowProps {
  contractId: string;
  users: UserDTO[];
  approvals: ApprovalDTO[];
  signatures: SignatureDTO[];
  attachments: AttachmentDTO[];
  versions: VersionDTO[];
  currentUserId: string | null;
  canManage: boolean;
  onRefresh: () => void;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${faNumber(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${faNumber(Math.round(bytes / 1024))} کیلوبایت`;
  return `${faNumber(Math.round((bytes / 1024 / 1024) * 10) / 10)} مگابایت`;
}

export function ApprovalPanel({
  contractId,
  users,
  approvals,
  signatures,
  currentUserId,
  canManage,
  onRefresh,
}: Omit<ContractWorkflowProps, "attachments" | "versions">) {
  const [flow, setFlow] = useState<string[]>([]);
  const [picker, setPicker] = useState("");
  const [note, setNote] = useState("");
  const [signerTitle, setSignerTitle] = useState("");

  const nameOf = (id: string) => users.find((u) => u.id === id)?.full_name ?? "کاربر";
  const fail = (p: string) => (e: Error) => toast.error(`${p}: ${e.message}`);

  const saveFlow = useMutation({
    mutationFn: () => setApprovalFlowFn({ data: { contractId, userIds: flow } }),
    onSuccess: () => {
      toast.success("گردش‌کار تأیید ثبت شد");
      setFlow([]);
      onRefresh();
    },
    onError: fail("ثبت گردش‌کار ناموفق"),
  });

  const decide = useMutation({
    mutationFn: (v: { approvalId: string; status: "approved" | "rejected" }) =>
      decideApprovalFn({ data: { approvalId: v.approvalId, status: v.status, note } }),
    onSuccess: () => {
      toast.success("نظر شما ثبت شد");
      setNote("");
      onRefresh();
    },
    onError: fail("ثبت نظر ناموفق"),
  });

  const sign = useMutation({
    mutationFn: () => signContractFn({ data: { contractId, signerTitle } }),
    onSuccess: () => {
      toast.success("قرارداد امضا شد");
      setSignerTitle("");
      onRefresh();
    },
    onError: fail("امضا ناموفق"),
  });

  const myPending = approvals.filter((a) => a.user_id === currentUserId && a.status === "pending");
  const available = users.filter((u) => !flow.includes(u.id));

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="panel p-5">
        <h3 className="text-sm font-bold">گردش‌کار تأیید</h3>

        {approvals.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">هنوز گردش‌کار تأییدی تعریف نشده است.</p>
        )}

        <ol className="mt-4 space-y-2">
          {approvals.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {faNumber(a.step)}
                </span>
                <div>
                  <p className="text-sm font-medium">{nameOf(a.user_id)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.decided_at ? faDateTime(a.decided_at) : "در انتظار اقدام"}
                    {a.note ? ` • ${a.note}` : ""}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={statusTone[a.status]}>
                {approvalStatusLabels[a.status]}
              </Badge>
            </li>
          ))}
        </ol>

        {myPending.length > 0 && (
          <div className="mt-5 space-y-3 rounded-xl border border-dashed p-4">
            <p className="text-sm font-semibold">تأیید در انتظار شما</p>
            <Textarea
              rows={2}
              placeholder="توضیح (اختیاری)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {myPending.map((a) => (
                <div key={a.id} className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ approvalId: a.id, status: "approved" })}
                  >
                    <CheckCircle2 className="size-4" /> تأیید مرحله {faNumber(a.step)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ approvalId: a.id, status: "rejected" })}
                  >
                    <XCircle className="size-4" /> رد
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {canManage && (
          <div className="mt-5 space-y-3 rounded-xl bg-muted/40 p-4">
            <p className="text-sm font-semibold">تعریف گردش‌کار جدید</p>
            <div className="flex flex-wrap gap-2">
              <Select value={picker} onValueChange={setPicker}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="افزودن تأییدکننده" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="gap-1"
                disabled={!picker}
                onClick={() => {
                  setFlow((f) => [...f, picker]);
                  setPicker("");
                }}
              >
                <Plus className="size-4" /> افزودن مرحله
              </Button>
            </div>

            {flow.length > 0 && (
              <ol className="space-y-1.5">
                {flow.map((id, i) => (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      مرحله {faNumber(i + 1)} — {nameOf(id)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFlow((f) => f.filter((x) => x !== id))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}

            <Button
              size="sm"
              disabled={flow.length === 0 || saveFlow.isPending}
              onClick={() => saveFlow.mutate()}
            >
              ذخیره گردش‌کار
            </Button>
            <p className="text-[11px] text-muted-foreground">
              با ذخیره، گردش‌کار قبلی جایگزین می‌شود.
            </p>
          </div>
        )}
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-bold">امضاها</h3>
        <div className="mt-3 space-y-2">
          {signatures.map((s) => (
            <div key={s.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{s.signer_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.signer_title || "—"} • {faDateTime(s.created_at)}
              </p>
            </div>
          ))}
          {signatures.length === 0 && (
            <p className="text-sm text-muted-foreground">هنوز امضایی ثبت نشده است.</p>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <Label>سمت امضاکننده</Label>
          <Input
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
            placeholder="مثلاً مدیر بازرگانی"
          />
          <Button
            className="w-full gap-2"
            disabled={sign.isPending}
            onClick={() => sign.mutate()}
          >
            <PenLine className="size-4" /> امضای قرارداد
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DocumentsPanel({
  contractId,
  users,
  attachments,
  versions,
  canManage,
  onRefresh,
}: Omit<ContractWorkflowProps, "approvals" | "signatures" | "currentUserId">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.full_name ?? "کاربر";

  const sorted = useMemo(() => [...versions].sort((a, b) => b.version - a.version), [versions]);

  const upload = useMutation({
    mutationFn: (payload: {
      name: string;
      content_type: string;
      size: number;
      data_url: string;
    }) => addAttachmentFn({ data: { contractId, ...payload } }),
    onSuccess: () => {
      toast.success("فایل بارگذاری شد");
      onRefresh();
    },
    onError: (e: Error) => toast.error("بارگذاری ناموفق: " + e.message),
  });

  const remove = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachmentFn({ data: { attachmentId } }),
    onSuccess: () => {
      toast.success("فایل حذف شد");
      onRefresh();
    },
    onError: (e: Error) => toast.error("حذف ناموفق: " + e.message),
  });

  async function handleFile(file: File) {
    if (file.size > MAX_SIZE) {
      toast.error("حداکثر حجم مجاز ۵ مگابایت است");
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBusy(false);
      upload.mutate({
        name: file.name,
        content_type: file.type || "application/octet-stream",
        size: file.size,
        data_url: String(reader.result ?? ""),
      });
    };
    reader.onerror = () => {
      setBusy(false);
      toast.error("خواندن فایل ناموفق بود");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">پیوست‌ها و تصاویر قرارداد</h3>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={busy || upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" /> بارگذاری
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />

        <div className="mt-4 space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fileSize(a.size)} • {nameOf(a.uploaded_by)} • {faDateTime(a.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {a.data_url && (
                  <Button asChild size="sm" variant="ghost">
                    <a href={a.data_url} download={a.name}>
                      دانلود
                    </a>
                  </Button>
                )}
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {attachments.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">فایلی ثبت نشده است.</p>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-bold">تاریخچه نسخه‌ها</h3>
        <ol className="mt-4 space-y-2">
          {sorted.map((v) => (
            <li key={v.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">نسخه {faNumber(v.version)}</p>
                <span className="text-[11px] text-muted-foreground">
                  {nameOf(v.created_by)} • {faDateTime(v.created_at)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{v.note || "بدون توضیح"}</p>
              <p className="mt-1 truncate text-xs">{v.snapshot_title}</p>
            </li>
          ))}
          {sorted.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز نسخه‌ای ثبت نشده است.
            </p>
          )}
        </ol>
      </div>
    </div>
  );
}
