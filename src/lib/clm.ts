import type { AppRole, ApprovalStatus, ContractStatus, ItemState } from "./types";

export type { AppRole, ApprovalStatus, ContractStatus, ItemState };

export const COMPANY_NAME = "گروه کانکت شریف";

export const roleLabels: Record<AppRole, string> = {
  admin: "مدیر سیستم",
  owner: "مالک قرارداد",
  reviewer: "بازبین",
  viewer: "مشاهده‌گر",
};

export const roleOrder: AppRole[] = ["admin", "owner", "reviewer", "viewer"];

export const itemStates: ItemState[] = ["not_started", "in_progress", "in_review", "done"];

export const itemStateLabels: Record<ItemState, string> = {
  not_started: "انجام نشده",
  in_progress: "در حال انجام",
  in_review: "در حال بازبینی",
  done: "انجام شده",
};

export const itemStateClasses: Record<ItemState, string> = {
  not_started: "bg-state-todo/12 text-state-todo border-state-todo/30",
  in_progress: "bg-state-progress/12 text-state-progress border-state-progress/30",
  in_review: "bg-state-review/15 text-state-review border-state-review/35",
  done: "bg-state-done/12 text-state-done border-state-done/30",
};

export const contractStatuses: ContractStatus[] = ["draft", "active", "expired", "terminated"];

export const contractStatusLabels: Record<ContractStatus, string> = {
  draft: "پیش‌نویس",
  active: "جاری",
  expired: "منقضی",
  terminated: "فسخ‌شده",
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده",
};

export const cities = [
  "تهران",
  "مشهد",
  "اصفهان",
  "شیراز",
  "تبریز",
  "کرج",
  "اهواز",
  "قم",
  "کرمان",
  "رشت",
  "یزد",
  "بندرعباس",
];

export const departments = [
  "مدیریت",
  "بازرگانی",
  "مالی",
  "حقوقی",
  "فنی و مهندسی",
  "منابع انسانی",
  "فروش",
  "پشتیبانی",
];

export const contractCategories = [
  "خرید و تأمین",
  "خدمات",
  "پیمانکاری",
  "همکاری و مشارکت",
  "اجاره",
  "استخدام",
  "محرمانگی (NDA)",
  "سایر",
];

export function faDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));
}

export function faDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function faNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("fa-IR").format(value ?? 0);
}

/** Days remaining until the contract ends (null when no end date). */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export const permissions = {
  canManageContracts: (roles: AppRole[]) => roles.includes("admin") || roles.includes("owner"),
  canChangeItemState: (roles: AppRole[]) =>
    roles.includes("admin") || roles.includes("owner") || roles.includes("reviewer"),
  canComment: (roles: AppRole[]) => roles.length > 0,
  isAdmin: (roles: AppRole[]) => roles.includes("admin"),
};
