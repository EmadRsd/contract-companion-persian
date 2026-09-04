import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { daysUntil, faDate, faNumber } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "تقویم قراردادها | سامانه CLM" },
      { name: "description", content: "تاریخ‌های مهم قراردادها شامل شروع، انقضا، تمدید و امضا." },
      { property: "og:title", content: "تقویم قراردادها" },
      { property: "og:description", content: "تاریخ‌های کلیدی قراردادها در یک نگاه." },
    ],
  }),
  component: CalendarPage,
});

type EventKind = "start" | "end" | "renewal" | "signature";

const kindLabels: Record<EventKind, string> = {
  start: "شروع قرارداد",
  end: "انقضای قرارداد",
  renewal: "هشدار تمدید",
  signature: "تاریخ امضا",
};

const kindClasses: Record<EventKind, string> = {
  start: "border-state-progress/40 text-state-progress",
  end: "border-destructive/50 text-destructive",
  renewal: "border-state-review/50 text-state-review",
  signature: "border-state-done/40 text-state-done",
};

function CalendarPage() {
  const { data, isLoading } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });

  if (isLoading || !data) return <Skeleton className="h-72 rounded-xl" />;

  const events: { date: string; kind: EventKind; contractId: string; title: string }[] = [];
  for (const c of data.contracts) {
    if (c.start_date) events.push({ date: c.start_date, kind: "start", contractId: c.id, title: c.title });
    if (c.signature_date)
      events.push({ date: c.signature_date, kind: "signature", contractId: c.id, title: c.title });
    if (c.end_date) {
      events.push({ date: c.end_date, kind: "end", contractId: c.id, title: c.title });
      const alert = new Date(c.end_date);
      alert.setDate(alert.getDate() - (c.renewal_alert_days || 30));
      events.push({
        date: alert.toISOString().slice(0, 10),
        kind: "renewal",
        contractId: c.id,
        title: c.title,
      });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const key = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(
      new Date(e.date),
    );
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">تقویم قراردادها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {faNumber(events.length)} رویداد ثبت‌شده بر اساس تاریخ‌های کلیدی قراردادها
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(kindLabels) as EventKind[]).map((k) => (
          <Badge key={k} variant="outline" className={kindClasses[k]}>
            {kindLabels[k]}
          </Badge>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 p-12 text-center">
          <CalendarDays className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">تاریخی برای نمایش وجود ندارد.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([month, list]) => (
            <div key={month} className="panel p-5">
              <h2 className="text-sm font-bold">{month}</h2>
              <div className="mt-3 divide-y">
                {list.map((e, idx) => {
                  const d = daysUntil(e.date);
                  return (
                    <Link
                      key={`${e.contractId}-${e.kind}-${idx}`}
                      to="/contracts/$contractId"
                      params={{ contractId: e.contractId }}
                      className="flex flex-wrap items-center gap-3 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {faDate(e.date)}
                      </span>
                      <Badge variant="outline" className={cn("shrink-0", kindClasses[e.kind])}>
                        {kindLabels[e.kind]}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {d === null ? "" : d >= 0 ? `${faNumber(d)} روز مانده` : "گذشته"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
