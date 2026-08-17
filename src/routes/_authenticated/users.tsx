import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import {
  createUserFn,
  deleteUserFn,
  listUsersFn,
  setUserPasswordFn,
  updateUserRolesFn,
} from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import { faDate, permissions, roleLabels, roleOrder, type AppRole } from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "کاربران و نقش‌ها | سامانه مدیریت قرارداد" },
      { name: "description", content: "ساخت کاربر، تعیین نقش و مدیریت دسترسی‌های سامانه." },
      { property: "og:title", content: "مدیریت کاربران و نقش‌ها" },
      { property: "og:description", content: "ساخت کاربر، تعیین نقش و مدیریت دسترسی‌های سامانه." },
    ],
  }),
  component: UsersPage,
});

const emptyForm = {
  username: "",
  password: "",
  full_name: "",
  email: "",
  roles: ["viewer"] as AppRole[],
};

function UsersPage() {
  const { roles, userId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const isAdmin = permissions.isAdmin(roles);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsersFn(),
    enabled: isAdmin,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });
  const fail = (e: Error) => toast.error(e.message.replace(/^Error:\s*/, ""));

  const createUser = useMutation({
    mutationFn: () => createUserFn({ data: form }),
    onSuccess: () => {
      toast.success("کاربر ساخته شد");
      setOpen(false);
      setForm(emptyForm);
      refresh();
    },
    onError: fail,
  });

  const setRoles = useMutation({
    mutationFn: (input: { userId: string; roles: AppRole[] }) => updateUserRolesFn({ data: input }),
    onSuccess: () => {
      toast.success("نقش‌ها به‌روزرسانی شد");
      refresh();
    },
    onError: fail,
  });

  const resetPassword = useMutation({
    mutationFn: (input: { userId: string; password: string }) =>
      setUserPasswordFn({ data: input }),
    onSuccess: () => toast.success("رمز عبور تغییر کرد"),
    onError: fail,
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => deleteUserFn({ data: { userId: id } }),
    onSuccess: () => {
      toast.success("کاربر حذف شد");
      refresh();
    },
    onError: fail,
  });

  if (!isAdmin) {
    return (
      <div className="panel p-12 text-center text-sm text-muted-foreground">
        فقط مدیر سیستم به این بخش دسترسی دارد.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">کاربران و نقش‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ساخت حساب کاربری و تعیین سطح دسترسی هر کاربر
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          کاربر جدید
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((u) => (
            <div key={u.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {u.full_name}
                    {u.is_root && (
                      <Badge variant="outline" className="mr-2">
                        کاربر ریشه
                      </Badge>
                    )}
                  </p>
                  <p dir="ltr" className="mt-1 text-right text-xs text-muted-foreground">
                    {u.username} • {u.email || "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ساخته شده در {faDate(u.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="تغییر رمز عبور"
                    onClick={() => {
                      const password = prompt("رمز عبور جدید (حداقل ۶ نویسه):");
                      if (password) resetPassword.mutate({ userId: u.id, password });
                    }}
                  >
                    <KeyRound className="size-4" />
                  </Button>
                  {!u.is_root && u.id !== userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="حذف کاربر"
                      onClick={() => {
                        if (confirm(`کاربر «${u.full_name}» حذف شود؟`)) removeUser.mutate(u.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
                {roleOrder.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={u.roles.includes(role)}
                      disabled={u.is_root || setRoles.isPending}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...u.roles, role]
                          : u.roles.filter((r) => r !== role);
                        setRoles.mutate({ userId: u.id, roles: next });
                      }}
                    />
                    {roleLabels[role]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel p-6 text-sm text-muted-foreground">
        <h2 className="mb-2 text-base font-bold text-foreground">راهنمای نقش‌ها</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>مدیر سیستم: دسترسی کامل، مدیریت کاربران و نقش‌ها</li>
          <li>مالک قرارداد: ایجاد و حذف قرارداد و بندها، تغییر وضعیت</li>
          <li>بازبین: تغییر وضعیت بندها و ثبت نظر</li>
          <li>مشاهده‌گر: فقط مشاهده</li>
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ساخت کاربر جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>نام کاربری</Label>
              <Input
                dir="ltr"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ایمیل (اختیاری)</Label>
              <Input
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>رمز عبور</Label>
              <Input
                dir="ltr"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>نقش‌ها</Label>
              <div className="flex flex-wrap gap-4">
                {roleOrder.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.roles.includes(role)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          roles: checked
                            ? [...form.roles, role]
                            : form.roles.filter((r) => r !== role),
                        })
                      }
                    />
                    {roleLabels[role]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createUser.mutate()}
              disabled={!form.username || !form.password || createUser.isPending}
            >
              ساخت کاربر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
