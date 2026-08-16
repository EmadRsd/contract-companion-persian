import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScrollText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ورود به سامانه مدیریت قرارداد" },
      { name: "description", content: "ورود یا ثبت‌نام در پنل مدیریت چرخه عمر قراردادها." },
      { property: "og:title", content: "ورود به سامانه مدیریت قرارداد" },
      { property: "og:description", content: "ورود یا ثبت‌نام در پنل مدیریت چرخه عمر قراردادها." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("ورود ناموفق بود: " + error.message);
      return;
    }
    toast.success("خوش آمدید");
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("ثبت‌نام ناموفق بود: " + error.message);
      return;
    }
    if (!data.session) {
      setPendingConfirm(true);
      toast.success("ایمیل تأیید برای شما ارسال شد");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <ScrollText className="size-6 text-primary" />
          <span className="text-lg font-bold">سامانه مدیریت قرارداد</span>
        </Link>

        <div className="panel p-6">
          {pendingConfirm ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-bold">ایمیل خود را تأیید کنید</h1>
              <p className="text-sm text-muted-foreground">
                لینک تأیید به {email} ارسال شد. پس از تأیید می‌توانید وارد شوید.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setPendingConfirm(false)}>
                بازگشت
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">ورود</TabsTrigger>
                <TabsTrigger value="signup">ثبت‌نام</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">ایمیل</Label>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">رمز عبور</Label>
                    <Input
                      id="password"
                      type="password"
                      dir="ltr"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    ورود
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">نام و نام خانوادگی</Label>
                    <Input
                      id="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">ایمیل</Label>
                    <Input
                      id="email2"
                      type="email"
                      dir="ltr"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password2">رمز عبور</Label>
                    <Input
                      id="password2"
                      type="password"
                      dir="ltr"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    ایجاد حساب
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            یا
            <span className="h-px flex-1 bg-border" />
          </div>

        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          نخستین کاربر ثبت‌نام‌شده به‌صورت خودکار مدیر سیستم می‌شود.
        </p>
      </div>
    </div>
  );
}
