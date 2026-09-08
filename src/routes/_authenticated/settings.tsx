import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Palette, UserCog } from "lucide-react";
import { toast } from "sonner";
import { changeOwnPasswordFn, updateOwnProfileFn } from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import { cities, departments, roleLabels, COMPANY_NAME } from "@/lib/clm";
import { useTheme } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات حساب | سامانه CLM کانکت شریف" },
      {
        name: "description",
        content: "ویرایش مشخصات کاربری، تغییر رمز عبور و انتخاب حالت روز یا شب.",
      },
      { property: "og:title", content: "تنظیمات حساب | سامانه CLM" },
      {
        property: "og:description",
        content: "مدیریت پروفایل، امنیت حساب و ظاهر سامانه مدیریت قراردادها.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [form, setForm] = useState({ full_name: "", email: "", city: "", department: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    setForm({
      full_name: auth.fullName ?? "",
      email: auth.email ?? "",
      city: auth.city ?? "",
      department: auth.department ?? "",
    });
  }, [auth.fullName, auth.email, auth.city, auth.department]);

  const saveProfile = useMutation({
    mutationFn: () => updateOwnProfileFn({ data: form }),
    onSuccess: () => {
      toast.success("مشخصات شما به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["session-info"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePassword = useMutation({
    mutationFn: () => changeOwnPasswordFn({ data: { current: pw.current, next: pw.next } }),
    onSuccess: () => {
      toast.success("رمز عبور تغییر کرد");
      setPw({ current: "", next: "", confirm: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isAdmin = auth.roles.includes("admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-sm text-muted-foreground">
          حساب کاربری شما در {COMPANY_NAME}
          {auth.roles.length
            ? ` • ${auth.roles.map((r) => roleLabels[r]).join("، ")}`
            : " • بدون نقش"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4 text-primary" /> مشخصات کاربری
            </CardTitle>
            <CardDescription>نام کاربری: {auth.username ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>نام و نام خانوادگی</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>شهر</Label>
                <Select
                  value={form.city}
                  onValueChange={(v) => setForm({ ...form, city: v })}
                  disabled={!isAdmin}
                >
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
                {!isAdmin && (
                  <p className="text-[11px] text-muted-foreground">
                    تغییر شهر فقط توسط مدیر سیستم ممکن است.
                  </p>
                )}
              </div>
              <div className="space-y-2">
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
            </div>
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              className="w-full"
            >
              ذخیره مشخصات
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4 text-primary" /> تغییر رمز عبور
              </CardTitle>
              <CardDescription>رمز عبور جدید حداقل ۶ نویسه باشد.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>رمز عبور فعلی</Label>
                <Input
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رمز عبور جدید</Label>
                <Input
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>تکرار رمز عبور جدید</Label>
                <Input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                disabled={savePassword.isPending}
                onClick={() => {
                  if (pw.next !== pw.confirm) {
                    toast.error("تکرار رمز عبور مطابقت ندارد");
                    return;
                  }
                  savePassword.mutate();
                }}
              >
                تغییر رمز عبور
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="size-4 text-primary" /> ظاهر سامانه
              </CardTitle>
              <CardDescription>حالت نمایش روز یا شب</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                روشن
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                تیره
              </Button>
              <Badge variant="outline" className="ms-auto text-[11px]">
                {theme === "dark" ? "حالت شب فعال" : "حالت روز فعال"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
