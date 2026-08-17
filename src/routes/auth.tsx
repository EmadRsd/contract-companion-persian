import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollText, Loader2 } from "lucide-react";
import { loginFn } from "@/lib/api.functions";
import { getToken, setToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ورود به سامانه مدیریت قرارداد" },
      { name: "description", content: "ورود با نام کاربری و رمز عبور به پنل مدیریت قراردادها." },
      { property: "og:title", content: "ورود به سامانه مدیریت قرارداد" },
      {
        property: "og:description",
        content: "ورود با نام کاربری و رمز عبور به پنل مدیریت قراردادها.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (getToken()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginFn({ data: { username, password } });
      setToken(result.token);
      await queryClient.invalidateQueries();
      toast.success("خوش آمدید");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ورود ناموفق بود";
      toast.error(message.replace(/^Unauthorized:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <ScrollText className="size-6 text-primary" />
          <span className="text-lg font-bold">سامانه مدیریت قرارداد</span>
        </Link>

        <div className="panel p-6">
          <h1 className="text-lg font-bold">ورود به حساب کاربری</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            حساب‌های کاربری توسط مدیر سیستم ساخته می‌شوند.
          </p>

          <form className="mt-6 space-y-4" onSubmit={signIn}>
            <div className="space-y-1.5">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                dir="ltr"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              ورود
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
