import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollText, ShieldCheck, MessagesSquare, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سامانه مدیریت چرخه عمر قرارداد (CLM)" },
      {
        name: "description",
        content:
          "قراردادها را به بند تبدیل کنید، وضعیت هر بند را دنبال کنید و با تیم زیر هر بند گفتگو کنید.",
      },
      { property: "og:title", content: "سامانه مدیریت چرخه عمر قرارداد (CLM)" },
      {
        property: "og:description",
        content: "مدیریت قرارداد، بندها، وضعیت‌ها و گفتگوی تیمی با دسترسی نقش‌محور.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ListChecks,
    title: "تبدیل قرارداد به بند",
    body: "متن قرارداد را به بندهای قابل بحث بشکنید و هر بند را جداگانه پیش ببرید.",
  },
  {
    icon: MessagesSquare,
    title: "گفتگو زیر هر بند",
    body: "تیم حقوقی و کسب‌وکار درست زیر همان بند نظر می‌دهند؛ بدون ایمیل و فایل پراکنده.",
  },
  {
    icon: ShieldCheck,
    title: "دسترسی نقش‌محور",
    body: "مدیر سیستم، مالک قرارداد، بازبین و مشاهده‌گر؛ هر نقش دقیقاً همان کاری را می‌کند که باید.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <ScrollText className="size-6 text-primary" />
          <span className="font-bold">سامانه CLM</span>
        </div>
        <Link to="/auth">
          <Button size="sm">ورود به پنل</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-20">
        <p className="text-sm font-semibold text-accent-foreground/80">
          مدیریت چرخه عمر قرارداد • فارسی و راست‌چین
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight md:text-5xl">
          قراردادها را از پیش‌نویس تا اجرا، بند به بند مدیریت کنید
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          هر قرارداد را به بندهای مشخص تقسیم کنید، وضعیت هر بند را بین «انجام نشده»، «در حال انجام»،
          «در حال بازبینی» و «انجام شده» جابه‌جا کنید و همان‌جا با تیم گفتگو کنید.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/auth">
            <Button size="lg">شروع کنید</Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              حساب دارم
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-base font-bold">{f.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        سامانه مدیریت چرخه عمر قرارداد
      </footer>
    </div>
  );
}
