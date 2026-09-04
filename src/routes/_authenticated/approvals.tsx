import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { decideApprovalFn, workspaceFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import { approvalStatusLabels, faDateTime, faNumber } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "تأییدها | سامانه CLM" },
      { name: "description", content: "گردش کار تأیید قراردادها و تصمیم‌گیری مرحله‌ای." },
      { property: "og:title", content: "گردش کار تأیید قراردادها" },
      { property: "og:description", content: "تأیید یا رد مراحل قرارداد با ثبت توضیح." },
    ],
  }),
  component: ApprovalsPage,
});

const statusClass: Record<string, string> = {
  pending: "border-state-review/40 text-state-review",
  approved: "border-state-done/40 text-state-done",
  rejected: "border-destructive/50 text-destructive",
};

function ApprovalsPage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const decide = useMutation({
    mutationFn: (v: { approvalId: string; status: "approved" | "rejected"; note: string }) =>
      decideApprovalFn({ data: v }),
    onSuccess: () => {
      toast.success("تصمیم شما ثبت شد");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <Skeleton className="h-72 rounded-xl" />;

  const byContract = data.contracts
    .map((c) => ({
      contract: c,
      steps: data.approvals
        .filter((a) => a.contract_id === c.id)
        .sort((a, b) => a.step - b.step),
    }))
    .filter((g) => g.steps.length > 0);

  const nameOf = (id: string) => data.users.find((u) => u.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">تأییدها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مراحل تأیید تعریف‌شده روی قراردادها و وضعیت هر مرحله
        </p>
      </div>

      {byContract.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 p-12 text-center">
          <ShieldCheck className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            هنوز گردش تأییدی تعریف نشده است. در صفحه قرارداد، تأییدکنندگان را مشخص کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {byContract.map(({ contract, steps }) => (
            <div key={contract.id} className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold">{contract.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {contract.counterparty || "بدون طرف قرارداد"} • {contract.city || "—"}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/contracts/$contractId" params={{ contractId: contract.id }}>
                    مشاهده قرارداد
                  </Link>
                </Button>
              </div>

              <ol className="mt-4 space-y-3">
                {steps.map((s) => {
                  const mine = s.user_id === userId && s.status === "pending";
                  return (
                    <li key={s.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {faNumber(s.step)}
                        </span>
                        <span className="text-sm font-medium">{nameOf(s.user_id)}</span>
                        <Badge variant="outline" className={cn(statusClass[s.status])}>
                          {approvalStatusLabels[s.status]}
                        </Badge>
                        <span className="ms-auto text-xs text-muted-foreground">
                          {s.decided_at ? faDateTime(s.decided_at) : "در انتظار"}
                        </span>
                      </div>
                      {s.note && <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>}

                      {mine && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            placeholder="توضیح (برای رد کردن الزامی است)"
                            value={notes[s.id] ?? ""}
                            onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={decide.isPending}
                              onClick={() =>
                                decide.mutate({
                                  approvalId: s.id,
                                  status: "approved",
                                  note: notes[s.id] ?? "",
                                })
                              }
                            >
                              تأیید
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={decide.isPending}
                              onClick={() => {
                                if (!(notes[s.id] ?? "").trim()) {
                                  toast.error("برای رد کردن، ثبت دلیل الزامی است");
                                  return;
                                }
                                decide.mutate({
                                  approvalId: s.id,
                                  status: "rejected",
                                  note: notes[s.id] ?? "",
                                });
                              }}
                            >
                              رد
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
