import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { workspaceFn } from "@/lib/api.functions";
import { contractStatusLabels, roleLabels } from "@/lib/clm";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["workspace"], queryFn: () => workspaceFn() });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <Search className="size-4" />
        <span className="flex-1 text-right">جستجوی قرارداد، طرف قرارداد، کاربر…</span>
        <kbd className="hidden rounded border px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="جستجو در کل سامانه…" />
        <CommandList>
          <CommandEmpty>نتیجه‌ای یافت نشد.</CommandEmpty>
          <CommandGroup heading="قراردادها">
            {(data?.contracts ?? []).slice(0, 40).map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.title} ${c.counterparty} ${c.category} ${c.city}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/contracts/$contractId", params: { contractId: c.id } });
                }}
              >
                <span className="truncate">{c.title}</span>
                <span className="ms-auto text-xs text-muted-foreground">
                  {contractStatusLabels[c.status]}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="قالب‌ها">
            {(data?.templates ?? []).slice(0, 15).map((t) => (
              <CommandItem
                key={t.id}
                value={`قالب ${t.title}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/templates" });
                }}
              >
                {t.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="کاربران">
            {(data?.users ?? []).slice(0, 20).map((u) => (
              <CommandItem
                key={u.id}
                value={`${u.full_name} ${u.username} ${u.email}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/users" });
                }}
              >
                <span>{u.full_name}</span>
                <span className="ms-auto text-xs text-muted-foreground">
                  {u.roles.map((r) => roleLabels[r]).join("، ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
