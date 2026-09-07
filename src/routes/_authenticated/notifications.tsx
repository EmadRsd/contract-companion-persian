import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, BellRing, CheckCircle2, ShieldAlert, TimerReset } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import { daysUntil, faDate, faNumber } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "اعلان‌ها | سامانه CLM کانکت شریف" },
      {
        name: "description",
        content: "هشدارهای تمدید، انقضا، تأییدهای در انتظار و قراردادهای نیازمند اقدام.",
      },
      { property: "og:title", content: "اعلان‌ها | سامانه CLM" },
      {
        property: "og:description",
        content: "همه هشدارهای مهم چرخه عمر قرارداد در یک صفحه.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

type Note = {
  id: string;
  contractId: string;
  title: string;
  text: string;
  tone: "danger" | "warning" | "info";
  date: string | null;
};

function Notifications() {
  const { userId } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });

  const notes = useMemo<Note[]>(() => {
    const out: Note[] = [];
    for (const c of data?.contracts ?? []) {
      const left = daysUntil(c.end_date);
      if (left !== null && left < 0 && c.status !== "terminated") {
        out.push({
          id: `exp-${c.id}`,
          contractId: c.id,
          title: c.title,
          text: `قرارداد ${faNumber(Math.abs(left))} روز پیش منقضی شده است.`,
          tone: "danger",
          date: c.end_date,
        });
      } else if (left !== null && left <= (c.renewal_alert_days || 30)) {
        out.push({
          id: `ren-${c.id}`,
          contractId: c.id,
          title: c.title,
          text: `تا پایان قرارداد ${faNumber(left)} روز باقی مانده؛ زمان بررسی تمدید است.`,
          tone: "warning",
          date: c.end_date,
        });
      }
      if (!c.end_date) {
        out.push({
          id: `meta-${c.id}`,
          contractId: c.id,
          title: c.title,
          text: "تاریخ پایان این قرارداد ثبت نشده است.",
          tone: "info",
          date: null,
        });
      }
    }
    for (const a of data?.approvals ?? []) {
      if (a.status !== "pending" || a.user_id !== userId) continue;
      const c = (data?.contracts ?? []).find((x) => x.id === a.contract_id);
      if (!c) continue;
      out.push({
        id: `apr-${a.id}`,
        contractId: c.id,
        title: c.title,
        text: `تأیید مرحله ${faNumber(a.step)} این قرارداد در انتظار شماست.`,
        tone: "warning",
        date: a.created_at,
      });
    }
    const order = { danger: 0, warning: 1, info: 2 } as const;
    return out.sort((a, b) => order[a.tone] - order[b.tone]);
  }, [data, userId]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const counts = {
    danger: notes.filter((n) => n.tone === "danger").length,
    warning: notes.filter((n) => n.tone === "warning").length,
    info: notes.filter((n) => n.tone === "info").length,
  };

  const icon = (tone: Note["tone"]) =>
    tone === "danger" ? (
      <ShieldAlert className="size-4 text-destructive" />
    ) : tone === "warning" ? (
      <AlarmClock className="size-4 text-state-review" />
    ) : (
      <TimerReset className="size-4 text-muted-foreground" />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">اعلان‌ها</h1>
        <p className="text-sm text-muted-foreground">
          {faNumber(notes.length)} هشدار فعال در محدوده دسترسی شما
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "بحرانی", value: counts.danger },
          { label: "هشدار", value: counts.warning },
          { label: "اطلاع‌رسانی", value: counts.info },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{faNumber(k.value)}</CardContent>
          </Card>
        ))}
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckCircle2 className="size-8 text-state-done" />
            <p className="text-sm text-muted-foreground">اعلان بازی وجود ندارد.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <BellRing className="size-4 text-primary" />
            <CardTitle className="text-base">فهرست اعلان‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map((n) => (
              <Link
                key={n.id}
                to="/contracts/$contractId"
                params={{ contractId: n.contractId }}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <span className="mt-0.5">{icon(n.tone)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                  <span className="block text-xs text-muted-foreground">{n.text}</span>
                </span>
                <Badge variant="outline" className="shrink-0 text-[11px]">
                  {faDate(n.date)}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
