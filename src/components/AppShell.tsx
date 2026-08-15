import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, LayoutDashboard, LogOut, Users, ScrollText } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { permissions, roleLabels } from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { to: "/contracts", label: "قراردادها", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { fullName, email, roles } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links = permissions.isAdmin(roles)
    ? [...nav, { to: "/users" as const, label: "کاربران و نقش‌ها", icon: Users }]
    : nav;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div>
          <div className="flex items-center gap-2 px-2">
            <ScrollText className="size-6 text-sidebar-primary" />
            <div>
              <p className="text-sm font-bold">سامانه CLM</p>
              <p className="text-[11px] text-sidebar-foreground/60">مدیریت چرخه عمر قرارداد</p>
            </div>
          </div>
          <nav className="mt-8 space-y-1">
            {links.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-xl bg-sidebar-accent/50 p-3">
          <p className="truncate text-sm font-semibold">{fullName ?? email}</p>
          <p className="mt-1 text-[11px] text-sidebar-foreground/60">
            {roles.length ? roles.map((r) => roleLabels[r]).join("، ") : "بدون نقش"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="mt-2 w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            خروج
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <ScrollText className="size-5 text-primary" />
            <span className="text-sm font-bold">سامانه CLM</span>
          </div>
          <div className="flex items-center gap-1">
            {links.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button variant="ghost" size="icon">
                  <item.icon className="size-4" />
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
