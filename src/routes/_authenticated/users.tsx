import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { faDate, permissions, roleLabels, roleOrder, type AppRole } from "@/lib/clm";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "کاربران و نقش‌ها | سامانه مدیریت قرارداد" },
      { name: "description", content: "مدیریت کاربران و تخصیص نقش‌های دسترسی در سامانه." },
      { property: "og:title", content: "کاربران و نقش‌ها" },
      { property: "og:description", content: "مدیریت کاربران و تخصیص نقش‌های دسترسی در سامانه." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { roles, userId } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = permissions.isAdmin(roles);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [profiles, userRoles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("user_roles").select("*"),
      ]);
      return { profiles: profiles.data ?? [], roles: userRoles.data ?? [] };
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", id);
      if (del.error) throw del.error;
      const ins = await supabase.from("user_roles").insert({ user_id: id, role });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      toast.success("نقش کاربر به‌روزرسانی شد");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["session-info"] });
    },
    onError: (e: Error) => toast.error("تغییر نقش ناموفق: " + e.message),
  });

  if (!isAdmin) {
    return (
      <div className="panel p-12 text-center text-sm text-muted-foreground">
        فقط مدیر سیستم به این بخش دسترسی دارد.
      </div>
    );
  }

  if (isLoading || !data) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">کاربران و نقش‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نقش هر کاربر تعیین می‌کند چه کارهایی در سامانه انجام دهد.
        </p>
      </div>

      <div className="panel divide-y">
        {data.profiles.map((p) => {
          const current = (data.roles.find((r) => r.user_id === p.id)?.role ?? "viewer") as AppRole;
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar className="size-9">
                <AvatarFallback>{(p.full_name ?? p.email ?? "؟").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.full_name ?? "بدون نام"}</p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {p.email}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">عضویت: {faDate(p.created_at)}</span>
              {p.id === userId ? (
                <Badge variant="outline">{roleLabels[current]} (شما)</Badge>
              ) : (
                <Select
                  value={current}
                  onValueChange={(v) => changeRole.mutate({ id: p.id, role: v as AppRole })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOrder.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-bold">راهنمای نقش‌ها</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• مدیر سیستم: دسترسی کامل، مدیریت کاربران و نقش‌ها.</li>
          <li>• مالک قرارداد: ایجاد و ویرایش قراردادها و بندها.</li>
          <li>• بازبین: تغییر وضعیت بندها و ثبت نظر.</li>
          <li>• مشاهده‌گر: فقط مشاهده.</li>
        </ul>
      </div>
    </div>
  );
}
