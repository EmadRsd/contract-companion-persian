import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Plus, Send, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  addCommentFn,
  addItemsFn,
  deleteContractFn,
  deleteItemFn,
  getContractFn,
  setItemStateFn,
  updateContractStatusFn,
} from "@/lib/api.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  contractStatusLabels,
  contractStatuses,
  faDate,
  faDateTime,
  faNumber,
  itemStateClasses,
  itemStateLabels,
  itemStates,
  permissions,
  type ContractStatus,
  type ItemState,
} from "@/lib/clm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contracts/$contractId")({
  head: () => ({
    meta: [
      { title: "جزئیات قرارداد | سامانه مدیریت قرارداد" },
      { name: "description", content: "بندهای قرارداد، وضعیت هر بند و گفتگوی تیمی." },
      { property: "og:title", content: "جزئیات قرارداد" },
      { property: "og:description", content: "بندهای قرارداد، وضعیت هر بند و گفتگوی تیمی." },
    ],
  }),
  component: ContractDetail,
});

function initials(name: string | null | undefined) {
  if (!name) return "؟";
  return name.trim().charAt(0);
}

function ContractDetail() {
  const { contractId } = Route.useParams();
  const { roles } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [itemDialog, setItemDialog] = useState(false);
  const [splitDialog, setSplitDialog] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", content: "" });

  const canManage = permissions.canManageContracts(roles);
  const canChangeState = permissions.canChangeItemState(roles);
  const canComment = permissions.canComment(roles);

  const { data, isLoading } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContractFn({ data: { contractId } }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
  const fail = (prefix: string) => (e: Error) => toast.error(`${prefix}: ${e.message}`);

  const addItem = useMutation({
    mutationFn: (payload: { title: string; content: string }[]) =>
      addItemsFn({ data: { contractId, items: payload } }),
    onSuccess: () => {
      toast.success("بندها ثبت شدند");
      setItemDialog(false);
      setSplitDialog(false);
      setNewItem({ title: "", content: "" });
      refresh();
    },
    onError: fail("ثبت نشد"),
  });

  const setState = useMutation({
    mutationFn: ({ id, state }: { id: string; state: ItemState }) =>
      setItemStateFn({ data: { itemId: id, state, label: itemStateLabels[state] } }),
    onSuccess: () => refresh(),
    onError: fail("تغییر وضعیت ناموفق"),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => deleteItemFn({ data: { itemId: id } }),
    onSuccess: () => {
      toast.success("بند حذف شد");
      setActiveItem(null);
      refresh();
    },
    onError: fail("حذف ناموفق"),
  });

  const setContractStatus = useMutation({
    mutationFn: (status: ContractStatus) =>
      updateContractStatusFn({
        data: { contractId, status, label: contractStatusLabels[status] },
      }),
    onSuccess: () => {
      toast.success("وضعیت قرارداد به‌روزرسانی شد");
      refresh();
    },
    onError: fail("به‌روزرسانی ناموفق"),
  });

  const deleteContract = useMutation({
    mutationFn: () => deleteContractFn({ data: { contractId } }),
    onSuccess: () => {
      toast.success("قرارداد حذف شد");
      navigate({ to: "/contracts" });
    },
    onError: fail("حذف ناموفق"),
  });

  const sendComment = useMutation({
    mutationFn: () =>
      addCommentFn({ data: { contractId, itemId: activeItem, body: message.trim() } }),
    onSuccess: () => {
      setMessage("");
      refresh();
    },
    onError: fail("ارسال نشد"),
  });

  function splitDescription() {
    const text = data?.contract?.description ?? "";
    const parts = text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length === 0) {
      toast.error("متن قرارداد برای تبدیل به بند خالی است");
      return;
    }
    addItem.mutate(parts.map((p, i) => ({ title: `بند ${i + 1}`, content: p })));
  }

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }
  if (!data) {
    return <div className="panel p-12 text-center text-sm">قرارداد یافت نشد.</div>;
  }

  const contract = data.contract;
  const nameOf = (id: string) => {
    const u = data.users.find((x) => x.id === id);
    return u?.full_name ?? u?.username ?? "کاربر";
  };
  const doneCount = data.items.filter((i) => i.state === "done").length;
  const threadComments = data.comments.filter((c) => c.item_id === activeItem);
  const activeItemData = data.items.find((i) => i.id === activeItem);

  return (
    <div className="space-y-6">
      <Link
        to="/contracts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        بازگشت به قراردادها
      </Link>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">{contract.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              طرف قرارداد: {contract.counterparty || "—"} • مبلغ: {faNumber(Number(contract.value))}{" "}
              ریال
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              از {faDate(contract.start_date)} تا {faDate(contract.end_date)} • ایجاد توسط{" "}
              {nameOf(contract.created_by)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <Select
                value={contract.status}
                onValueChange={(v) => setContractStatus.mutate(v as ContractStatus)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {contractStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline">{contractStatusLabels[contract.status]}</Badge>
            )}
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("این قرارداد و همه بندهای آن حذف شود؟")) deleteContract.mutate();
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>پیشرفت بندها</span>
            <span>
              {faNumber(doneCount)} از {faNumber(data.items.length)}
            </span>
          </div>
          <Progress value={data.items.length ? (doneCount / data.items.length) * 100 : 0} />
        </div>
      </div>

      <Tabs defaultValue="items" dir="rtl">
        <TabsList>
          <TabsTrigger value="items">بندهای قرارداد</TabsTrigger>
          <TabsTrigger value="text">متن قرارداد</TabsTrigger>
          <TabsTrigger value="activity">تاریخچه فعالیت</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-4">
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2" onClick={() => setItemDialog(true)}>
                <Plus className="size-4" />
                بند جدید
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setSplitDialog(true)}>
                <Wand2 className="size-4" />
                تبدیل متن قرارداد به بند
              </Button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-4">
            {itemStates.map((state) => (
              <div key={state} className="space-y-2">
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-bold",
                    itemStateClasses[state],
                  )}
                >
                  {itemStateLabels[state]} (
                  {faNumber(data.items.filter((i) => i.state === state).length)})
                </div>
                {data.items
                  .filter((i) => i.state === state)
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveItem(item.id)}
                      className={cn(
                        "panel w-full p-3 text-right transition-shadow hover:shadow-lg",
                        activeItem === item.id && "ring-2 ring-ring",
                      )}
                    >
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                        {item.content}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {faNumber(data.comments.filter((c) => c.item_id === item.id).length)} نظر
                      </p>
                    </button>
                  ))}
              </div>
            ))}
          </div>

          {data.items.length === 0 && (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              هنوز بندی ثبت نشده است.
            </div>
          )}

          {activeItemData && (
            <div className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold">{activeItemData.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {activeItemData.content}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canChangeState ? (
                    <Select
                      value={activeItemData.state}
                      onValueChange={(v) =>
                        setState.mutate({ id: activeItemData.id, state: v as ItemState })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {itemStates.map((s) => (
                          <SelectItem key={s} value={s}>
                            {itemStateLabels[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{itemStateLabels[activeItemData.state]}</Badge>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItem.mutate(activeItemData.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t pt-4">
                <h4 className="text-sm font-bold">گفتگو زیر این بند</h4>
                <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                  {threadComments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {initials(nameOf(c.user_id))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">{nameOf(c.user_id)}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {faDateTime(c.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                      </div>
                    </div>
                  ))}
                  {threadComments.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      هنوز نظری ثبت نشده است.
                    </p>
                  )}
                </div>

                {canComment ? (
                  <form
                    className="mt-4 flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendComment.mutate();
                    }}
                  >
                    <Textarea
                      rows={2}
                      placeholder="نظر خود را درباره این بند بنویسید…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button type="submit" size="icon" disabled={!message.trim()}>
                      <Send className="size-4" />
                    </Button>
                  </form>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">نقش شما اجازه ثبت نظر ندارد.</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <div className="panel whitespace-pre-wrap p-6 text-sm leading-7">
            {contract.description || "متنی ثبت نشده است."}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="panel divide-y p-2">
            {data.activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
                <span>{a.action}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {nameOf(a.user_id)} • {faDateTime(a.created_at)}
                </span>
              </div>
            ))}
            {data.activity.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">فعالیتی ثبت نشده است.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بند جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>عنوان بند</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>متن بند</Label>
              <Textarea
                rows={5}
                value={newItem.content}
                onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!newItem.title || addItem.isPending}
              onClick={() => addItem.mutate([newItem])}
            >
              افزودن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={splitDialog} onOpenChange={setSplitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تبدیل متن قرارداد به بند</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            متن قرارداد بر اساس پاراگراف‌ها به بندهای جداگانه تبدیل می‌شود و هر بند قابل بحث و
            پیگیری خواهد بود.
          </p>
          <DialogFooter>
            <Button onClick={splitDescription} disabled={addItem.isPending}>
              انجام بده
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
