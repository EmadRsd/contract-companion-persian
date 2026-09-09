import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileArchive,
  FileStack,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ScrollText,
  Settings,
  ShieldCheck,
  BarChart3,
  Users,
} from "lucide-react";

import type { ReactNode } from "react";
import konnectLogo from "@/assets/konnect-logo-main.png.asset.json";
import { clearToken } from "@/lib/session";
import { useAuth } from "@/hooks/useAuth";
import { permissions, roleLabels, COMPANY_NAME } from "@/lib/clm";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "clm.sidebar.collapsed";

const baseNav = [
  { to: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { to: "/contracts", label: "قراردادها", icon: FileText },
  { to: "/tasks", label: "کارهای من", icon: ClipboardList },
  { to: "/approvals", label: "تأییدها", icon: ShieldCheck },
  { to: "/templates", label: "قالب‌ها", icon: FileStack },
  { to: "/counterparties", label: "طرف‌های قرارداد", icon: Building2 },
  { to: "/documents", label: "اسناد", icon: FileArchive },
  { to: "/calendar", label: "تقویم", icon: CalendarDays },
  { to: "/notifications", label: "اعلان‌ها", icon: Bell },
  { to: "/reports", label: "گزارش‌ها و تحلیل", icon: BarChart3 },
  { to: "/audit", label: "گزارش ممیزی", icon: ScrollText },
  { to: "/settings", label: "تنظیمات", icon: Settings },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { fullName, username, roles, department } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      window.localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    clearToken();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  const links = permissions.isAdmin(roles)
    ? [...baseNav, { to: "/users" as const, label: "کاربران و نقش‌ها", icon: Users }]
    : baseNav;

  const roleText = roles.length ? roles.map((r) => roleLabels[r]).join("، ") : "بدون نقش";
  const initials = (fullName ?? username ?? "؟").trim().charAt(0);

  const navList = (onNavigate?: () => void) => (
    <nav className="space-y-1">
      {links.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={item.label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className={cn("flex items-center gap-2 px-2", collapsed && "justify-center px-0")}>
      <img
        src={konnectLogo.url}
        alt={`لوگو ${COMPANY_NAME}`}
        className="size-9 shrink-0 rounded-md bg-white/90 object-contain p-1"
      />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">سامانه CLM</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">{COMPANY_NAME}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col justify-between bg-sidebar py-6 text-sidebar-foreground transition-[width] md:flex",
          collapsed ? "w-[74px] px-2" : "w-64 px-4",
        )}
      >
        <div>
          {brand}
          <div className="mt-8">{navList()}</div>
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className="w-full justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
          >
            <ChevronRight className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
          {!collapsed && (
            <div className="rounded-xl bg-sidebar-accent/50 p-3">
              <p className="truncate text-sm font-semibold">{fullName ?? username}</p>
              <p className="mt-1 truncate text-[11px] text-sidebar-foreground/60">{roleText}</p>
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
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-surface/95 px-3 py-2.5 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="منو">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-sidebar p-4 text-sidebar-foreground">
              <SheetTitle className="sr-only">منوی اصلی</SheetTitle>
              {brand}
              <div className="mt-6">{navList(() => setMobileOpen(false))}</div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>

          <Button asChild size="sm" className="hidden gap-1 sm:inline-flex">
            <Link to="/contracts">
              <Plus className="size-4" /> ایجاد سریع
            </Link>
          </Button>
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-primary/10 font-bold text-primary"
                aria-label="حساب کاربری"
              >
                {initials}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="truncate text-sm">{fullName ?? username}</p>
                <p className="truncate text-[11px] font-normal text-muted-foreground">
                  {roleText}
                  {department ? ` • ${department}` : ""}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/tasks">کارهای من</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/reports">گزارش‌ها</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="size-4" /> خروج از حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
