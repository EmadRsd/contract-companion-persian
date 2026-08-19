// Server-only business logic backed by MongoDB.
import { ObjectId, type Filter, type WithId } from "mongodb";
import {
  collections,
  type ActivityDoc,
  type ApprovalDoc,
  type AttachmentDoc,
  type CommentDoc,
  type ContractDoc,
  type ItemDoc,
  type SignatureDoc,
  type UserDoc,
  type VersionDoc,
} from "./db.server";
import { hashPassword, signToken, verifyPassword } from "./auth.server";
import type {
  ActivityDTO,
  ApprovalDTO,
  ApprovalStatus,
  AppRole,
  AttachmentDTO,
  CommentDTO,
  ContractDTO,
  ContractItemDTO,
  ContractStatus,
  ItemState,
  SignatureDTO,
  UserDTO,
  VersionDTO,
} from "./types";

export const ALL_ROLES: AppRole[] = ["admin", "owner", "reviewer", "viewer"];

function oid(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("شناسه نامعتبر است");
  return new ObjectId(id);
}

export function toUser(doc: WithId<UserDoc>): UserDTO {
  return {
    id: doc._id.toString(),
    username: doc.username,
    full_name: doc.full_name,
    email: doc.email,
    city: doc.city ?? "",
    department: doc.department ?? "",
    roles: (doc.roles ?? []) as AppRole[],
    is_root: Boolean(doc.is_root),
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toContract(doc: WithId<ContractDoc>): ContractDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    counterparty: doc.counterparty ?? "",
    description: doc.description ?? "",
    value: doc.value ?? 0,
    city: doc.city ?? "",
    department: doc.department ?? "",
    category: doc.category ?? "",
    tags: doc.tags ?? [],
    assignees: doc.assignees ?? [],
    start_date: doc.start_date ?? null,
    end_date: doc.end_date ?? null,
    signature_date: doc.signature_date ?? null,
    renewal_alert_days: doc.renewal_alert_days ?? 30,
    status: doc.status as ContractStatus,
    is_template: Boolean(doc.is_template),
    version: doc.version ?? 1,
    created_by: doc.created_by,
    created_at: new Date(doc.created_at).toISOString(),
    updated_at: new Date(doc.updated_at).toISOString(),
  };
}

function toItem(doc: WithId<ItemDoc>): ContractItemDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    title: doc.title,
    content: doc.content ?? "",
    state: doc.state as ItemState,
    position: doc.position ?? 0,
    created_by: doc.created_by,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toComment(doc: WithId<CommentDoc>): CommentDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    item_id: doc.item_id ?? null,
    user_id: doc.user_id,
    body: doc.body,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toActivity(doc: WithId<ActivityDoc>): ActivityDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    user_id: doc.user_id,
    action: doc.action,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toAttachment(doc: WithId<AttachmentDoc>): AttachmentDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    name: doc.name,
    content_type: doc.content_type,
    size: doc.size,
    data_url: doc.data_url,
    uploaded_by: doc.uploaded_by,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toVersion(doc: WithId<VersionDoc>): VersionDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    version: doc.version,
    note: doc.note ?? "",
    snapshot_title: doc.snapshot_title ?? "",
    snapshot_description: doc.snapshot_description ?? "",
    created_by: doc.created_by,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toSignature(doc: WithId<SignatureDoc>): SignatureDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    user_id: doc.user_id,
    signer_name: doc.signer_name,
    signer_title: doc.signer_title ?? "",
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function toApproval(doc: WithId<ApprovalDoc>): ApprovalDTO {
  return {
    id: doc._id.toString(),
    contract_id: doc.contract_id,
    step: doc.step,
    user_id: doc.user_id,
    status: doc.status as ApprovalStatus,
    note: doc.note ?? "",
    decided_at: doc.decided_at ? new Date(doc.decided_at).toISOString() : null,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

export async function findUserById(id: string): Promise<UserDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const { users } = await collections();
  const doc = await users.findOne({ _id: new ObjectId(id) });
  return doc ? toUser(doc) : null;
}

export async function login(username: string, password: string) {
  const { users } = await collections();
  const doc = await users.findOne({ username: username.trim().toLowerCase() });
  if (!doc || !(await verifyPassword(password, doc.password_hash))) {
    throw new Error("نام کاربری یا رمز عبور نادرست است");
  }
  return { token: await signToken(doc._id.toString()), user: toUser(doc) };
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export const can = {
  admin: (u: UserDTO) => u.roles.includes("admin"),
  manage: (u: UserDTO) => u.roles.includes("admin") || u.roles.includes("owner"),
  state: (u: UserDTO) =>
    u.roles.includes("admin") || u.roles.includes("owner") || u.roles.includes("reviewer"),
};

/** City-scoped visibility: admins see everything, others only their own city / assigned contracts. */
function scopeFilter(actor: UserDTO): Filter<ContractDoc> {
  if (can.admin(actor)) return {};
  return {
    $or: [
      { city: actor.city || "__none__" },
      { assignees: actor.id },
      { created_by: actor.id },
    ],
  } as Filter<ContractDoc>;
}

function inScope(actor: UserDTO, c: ContractDTO) {
  if (can.admin(actor)) return true;
  return (
    (!!actor.city && c.city === actor.city) ||
    c.assignees.includes(actor.id) ||
    c.created_by === actor.id
  );
}

// ---------------- Users, roles, departments ----------------

export async function listUsers(actor: UserDTO): Promise<UserDTO[]> {
  assert(can.manage(actor), "شما به این بخش دسترسی ندارید");
  const { users } = await collections();
  return (await users.find().sort({ created_at: 1 }).toArray()).map(toUser);
}

export async function createUser(
  actor: UserDTO,
  input: {
    username: string;
    password: string;
    full_name: string;
    email: string;
    city: string;
    department: string;
    roles: AppRole[];
  },
): Promise<UserDTO> {
  assert(can.admin(actor), "فقط مدیر سیستم می‌تواند کاربر بسازد");
  const username = input.username.trim().toLowerCase();
  assert(username.length >= 3, "نام کاربری باید حداقل ۳ نویسه باشد");
  assert(input.password.length >= 6, "رمز عبور باید حداقل ۶ نویسه باشد");
  const { users } = await collections();
  assert(!(await users.findOne({ username })), "این نام کاربری قبلاً ثبت شده است");
  const roles = input.roles.filter((r) => ALL_ROLES.includes(r));
  const doc: UserDoc = {
    username,
    full_name: input.full_name.trim() || username,
    email: input.email.trim(),
    city: input.city.trim(),
    department: input.department.trim(),
    password_hash: await hashPassword(input.password),
    roles: roles.length ? roles : ["viewer"],
    is_root: false,
    created_at: new Date(),
  };
  const res = await users.insertOne(doc as UserDoc);
  return toUser({ ...doc, _id: res.insertedId } as WithId<UserDoc>);
}

export async function updateUserRoles(actor: UserDTO, userId: string, roles: AppRole[]) {
  assert(can.admin(actor), "فقط مدیر سیستم می‌تواند نقش‌ها را تغییر دهد");
  const { users } = await collections();
  const target = await users.findOne({ _id: oid(userId) });
  assert(!!target, "کاربر یافت نشد");
  assert(!target!.is_root, "نقش کاربر ریشه قابل تغییر نیست");
  const clean = roles.filter((r) => ALL_ROLES.includes(r));
  await users.updateOne(
    { _id: oid(userId) },
    { $set: { roles: clean.length ? clean : ["viewer"] } },
  );
  return { ok: true };
}

export async function updateUserProfile(
  actor: UserDTO,
  userId: string,
  input: { full_name: string; email: string; city: string; department: string },
) {
  assert(can.admin(actor), "فقط مدیر سیستم می‌تواند مشخصات کاربر را تغییر دهد");
  const { users } = await collections();
  await users.updateOne(
    { _id: oid(userId) },
    {
      $set: {
        full_name: input.full_name.trim(),
        email: input.email.trim(),
        city: input.city.trim(),
        department: input.department.trim(),
      },
    },
  );
  return { ok: true };
}

export async function setUserPassword(actor: UserDTO, userId: string, password: string) {
  assert(can.admin(actor), "فقط مدیر سیستم می‌تواند رمز عبور را تغییر دهد");
  assert(password.length >= 6, "رمز عبور باید حداقل ۶ نویسه باشد");
  const { users } = await collections();
  await users.updateOne(
    { _id: oid(userId) },
    { $set: { password_hash: await hashPassword(password) } },
  );
  return { ok: true };
}

export async function deleteUser(actor: UserDTO, userId: string) {
  assert(can.admin(actor), "فقط مدیر سیستم می‌تواند کاربر حذف کند");
  assert(actor.id !== userId, "حذف حساب خودتان ممکن نیست");
  const { users } = await collections();
  const target = await users.findOne({ _id: oid(userId) });
  assert(!!target, "کاربر یافت نشد");
  assert(!target!.is_root, "کاربر ریشه قابل حذف نیست");
  await users.deleteOne({ _id: oid(userId) });
  return { ok: true };
}

// ---------------- Contracts ----------------

export async function listContracts(actor: UserDTO) {
  const { contracts, items, users } = await collections();
  const c = await contracts
    .find({ ...scopeFilter(actor), is_template: { $ne: true } })
    .sort({ created_at: -1 })
    .toArray();
  const ids = c.map((d) => d._id.toString());
  const [i, us] = await Promise.all([
    items.find({ contract_id: { $in: ids } }).toArray(),
    users.find().toArray(),
  ]);
  return { contracts: c.map(toContract), items: i.map(toItem), users: us.map(toUser) };
}

export async function listTemplates(actor: UserDTO) {
  const { contracts } = await collections();
  const c = await contracts.find({ is_template: true }).sort({ created_at: -1 }).toArray();
  return { templates: c.map(toContract) };
}

export async function dashboardData(actor: UserDTO) {
  const { contracts, items, comments } = await collections();
  const c = await contracts
    .find({ ...scopeFilter(actor), is_template: { $ne: true } })
    .sort({ updated_at: -1 })
    .limit(300)
    .toArray();
  const ids = c.map((d) => d._id.toString());
  const [i, commentCount] = await Promise.all([
    items.find({ contract_id: { $in: ids } }).toArray(),
    comments.countDocuments({ contract_id: { $in: ids } }),
  ]);
  return { contracts: c.map(toContract), items: i.map(toItem), commentCount };
}

export async function getContract(actor: UserDTO, contractId: string) {
  const {
    contracts,
    items,
    comments,
    activity,
    users,
    attachments,
    versions,
    signatures,
    approvals,
  } = await collections();
  const doc = await contracts.findOne({ _id: oid(contractId) });
  if (!doc) return null;
  const contract = toContract(doc);
  assert(inScope(actor, contract), "این قرارداد متعلق به شهر شما نیست");
  const [i, cm, ac, us, at, vr, sg, ap] = await Promise.all([
    items.find({ contract_id: contractId }).sort({ position: 1 }).toArray(),
    comments.find({ contract_id: contractId }).sort({ created_at: 1 }).toArray(),
    activity.find({ contract_id: contractId }).sort({ created_at: -1 }).limit(80).toArray(),
    users.find().toArray(),
    attachments.find({ contract_id: contractId }).sort({ created_at: -1 }).toArray(),
    versions.find({ contract_id: contractId }).sort({ version: -1 }).toArray(),
    signatures.find({ contract_id: contractId }).sort({ created_at: 1 }).toArray(),
    approvals.find({ contract_id: contractId }).sort({ step: 1 }).toArray(),
  ]);
  return {
    contract,
    items: i.map(toItem),
    comments: cm.map(toComment),
    activity: ac.map(toActivity),
    users: us.map(toUser),
    attachments: at.map(toAttachment),
    versions: vr.map(toVersion),
    signatures: sg.map(toSignature),
    approvals: ap.map(toApproval),
  };
}

async function log(contractId: string, userId: string, action: string) {
  const { activity } = await collections();
  await activity.insertOne({
    contract_id: contractId,
    user_id: userId,
    action,
    created_at: new Date(),
  } as ActivityDoc);
}

export interface ContractInput {
  title: string;
  counterparty: string;
  description: string;
  value: number;
  city: string;
  department: string;
  category: string;
  tags: string[];
  assignees: string[];
  start_date: string | null;
  end_date: string | null;
  signature_date: string | null;
  renewal_alert_days: number;
  status: ContractStatus;
  is_template: boolean;
}

export async function createContract(actor: UserDTO, input: ContractInput) {
  assert(can.manage(actor), "شما اجازه ایجاد قرارداد ندارید");
  assert(input.title.trim().length > 0, "عنوان قرارداد الزامی است");
  const { contracts, versions } = await collections();
  const now = new Date();
  const res = await contracts.insertOne({
    ...input,
    title: input.title.trim(),
    city: input.city.trim() || actor.city,
    version: 1,
    created_by: actor.id,
    created_at: now,
    updated_at: now,
  } as ContractDoc);
  const id = res.insertedId.toString();
  await versions.insertOne({
    contract_id: id,
    version: 1,
    note: "نسخه اولیه",
    snapshot_title: input.title,
    snapshot_description: input.description,
    created_by: actor.id,
    created_at: now,
  } as VersionDoc);
  await log(id, actor.id, `قرارداد «${input.title}» ایجاد شد`);
  return { id };
}

export async function updateContract(actor: UserDTO, contractId: string, input: ContractInput) {
  assert(can.manage(actor), "شما اجازه ویرایش قرارداد ندارید");
  const { contracts, versions } = await collections();
  const doc = await contracts.findOne({ _id: oid(contractId) });
  assert(!!doc, "قرارداد یافت نشد");
  const nextVersion = (doc!.version ?? 1) + 1;
  const now = new Date();
  await contracts.updateOne(
    { _id: oid(contractId) },
    { $set: { ...input, version: nextVersion, updated_at: now } },
  );
  await versions.insertOne({
    contract_id: contractId,
    version: nextVersion,
    note: "ویرایش اطلاعات قرارداد",
    snapshot_title: input.title,
    snapshot_description: input.description,
    created_by: actor.id,
    created_at: now,
  } as VersionDoc);
  await log(contractId, actor.id, `قرارداد ویرایش شد (نسخه ${nextVersion})`);
  return { ok: true };
}

export async function createFromTemplate(
  actor: UserDTO,
  templateId: string,
  overrides: { title: string; counterparty: string; city: string },
) {
  assert(can.manage(actor), "شما اجازه ایجاد قرارداد ندارید");
  const { contracts, items } = await collections();
  const tpl = await contracts.findOne({ _id: oid(templateId), is_template: true });
  assert(!!tpl, "قالب یافت نشد");
  const t = toContract(tpl!);
  const created = await createContract(actor, {
    title: overrides.title || t.title,
    counterparty: overrides.counterparty,
    description: t.description,
    value: t.value,
    city: overrides.city || actor.city,
    department: t.department,
    category: t.category,
    tags: t.tags,
    assignees: [],
    start_date: null,
    end_date: null,
    signature_date: null,
    renewal_alert_days: t.renewal_alert_days,
    status: "draft",
    is_template: false,
  });
  const tplItems = await items.find({ contract_id: templateId }).sort({ position: 1 }).toArray();
  if (tplItems.length) {
    await items.insertMany(
      tplItems.map((it, idx) => ({
        contract_id: created.id,
        title: it.title,
        content: it.content,
        state: "not_started",
        position: idx,
        created_by: actor.id,
        created_at: new Date(),
      })) as ItemDoc[],
    );
  }
  await log(created.id, actor.id, `قرارداد از روی قالب «${t.title}» ساخته شد`);
  return created;
}

export async function assignContract(actor: UserDTO, contractId: string, assignees: string[]) {
  assert(can.manage(actor), "شما اجازه واگذاری قرارداد را ندارید");
  const { contracts } = await collections();
  await contracts.updateOne(
    { _id: oid(contractId) },
    { $set: { assignees, updated_at: new Date() } },
  );
  await log(contractId, actor.id, `کاربران قرارداد به‌روزرسانی شد (${assignees.length} نفر)`);
  return { ok: true };
}

export async function updateContractStatus(
  actor: UserDTO,
  contractId: string,
  status: ContractStatus,
  label: string,
) {
  assert(can.manage(actor), "شما اجازه تغییر وضعیت قرارداد را ندارید");
  const { contracts } = await collections();
  await contracts.updateOne({ _id: oid(contractId) }, { $set: { status, updated_at: new Date() } });
  await log(contractId, actor.id, `وضعیت قرارداد به «${label}» تغییر کرد`);
  return { ok: true };
}

export async function deleteContract(actor: UserDTO, contractId: string) {
  assert(can.manage(actor), "شما اجازه حذف قرارداد را ندارید");
  const { contracts, items, comments, activity, attachments, versions, signatures, approvals } =
    await collections();
  await Promise.all([
    contracts.deleteOne({ _id: oid(contractId) }),
    items.deleteMany({ contract_id: contractId }),
    comments.deleteMany({ contract_id: contractId }),
    activity.deleteMany({ contract_id: contractId }),
    attachments.deleteMany({ contract_id: contractId }),
    versions.deleteMany({ contract_id: contractId }),
    signatures.deleteMany({ contract_id: contractId }),
    approvals.deleteMany({ contract_id: contractId }),
  ]);
  return { ok: true };
}

// ---------------- Items, comments ----------------

export async function addItems(
  actor: UserDTO,
  contractId: string,
  payload: { title: string; content: string }[],
) {
  assert(can.manage(actor), "شما اجازه افزودن بند ندارید");
  const { items, contracts } = await collections();
  const base = await items.countDocuments({ contract_id: contractId });
  const now = new Date();
  await items.insertMany(
    payload.map((p, idx) => ({
      contract_id: contractId,
      title: p.title,
      content: p.content,
      state: "not_started",
      position: base + idx,
      created_by: actor.id,
      created_at: now,
    })) as ItemDoc[],
  );
  await contracts.updateOne({ _id: oid(contractId) }, { $set: { updated_at: now } });
  await log(contractId, actor.id, `${payload.length} بند به قرارداد اضافه شد`);
  return { ok: true };
}

export async function setItemState(
  actor: UserDTO,
  itemId: string,
  state: ItemState,
  label: string,
) {
  assert(can.state(actor), "شما اجازه تغییر وضعیت بند را ندارید");
  const { items } = await collections();
  const item = await items.findOne({ _id: oid(itemId) });
  assert(!!item, "بند یافت نشد");
  await items.updateOne({ _id: oid(itemId) }, { $set: { state } });
  await log(item!.contract_id, actor.id, `وضعیت بند «${item!.title}» به «${label}» تغییر کرد`);
  return { ok: true };
}

export async function deleteItem(actor: UserDTO, itemId: string) {
  assert(can.manage(actor), "شما اجازه حذف بند ندارید");
  const { items, comments } = await collections();
  const item = await items.findOne({ _id: oid(itemId) });
  assert(!!item, "بند یافت نشد");
  await items.deleteOne({ _id: oid(itemId) });
  await comments.deleteMany({ item_id: itemId });
  await log(item!.contract_id, actor.id, `بند «${item!.title}» حذف شد`);
  return { ok: true };
}

export async function addComment(
  actor: UserDTO,
  contractId: string,
  itemId: string | null,
  body: string,
) {
  assert(body.trim().length > 0, "متن پیام خالی است");
  const { comments, contracts } = await collections();
  const doc = await contracts.findOne({ _id: oid(contractId) });
  assert(!!doc, "قرارداد یافت نشد");
  assert(inScope(actor, toContract(doc!)), "شما فقط در قراردادهای شهر خود می‌توانید گفتگو کنید");
  await comments.insertOne({
    contract_id: contractId,
    item_id: itemId,
    user_id: actor.id,
    body: body.trim(),
    created_at: new Date(),
  } as CommentDoc);
  return { ok: true };
}

// ---------------- Attachments ----------------

export async function addAttachment(
  actor: UserDTO,
  contractId: string,
  file: { name: string; content_type: string; size: number; data_url: string },
) {
  assert(can.manage(actor) || can.state(actor), "شما اجازه بارگذاری فایل ندارید");
  assert(file.size <= 5 * 1024 * 1024, "حجم فایل نباید بیش از ۵ مگابایت باشد");
  const { attachments, contracts } = await collections();
  const doc = await contracts.findOne({ _id: oid(contractId) });
  assert(!!doc, "قرارداد یافت نشد");
  assert(inScope(actor, toContract(doc!)), "دسترسی به این قرارداد ندارید");
  await attachments.insertOne({
    contract_id: contractId,
    name: file.name,
    content_type: file.content_type,
    size: file.size,
    data_url: file.data_url,
    uploaded_by: actor.id,
    created_at: new Date(),
  } as AttachmentDoc);
  await log(contractId, actor.id, `فایل «${file.name}» بارگذاری شد`);
  return { ok: true };
}

export async function deleteAttachment(actor: UserDTO, attachmentId: string) {
  assert(can.manage(actor), "شما اجازه حذف فایل ندارید");
  const { attachments } = await collections();
  const doc = await attachments.findOne({ _id: oid(attachmentId) });
  assert(!!doc, "فایل یافت نشد");
  await attachments.deleteOne({ _id: oid(attachmentId) });
  await log(doc!.contract_id, actor.id, `فایل «${doc!.name}» حذف شد`);
  return { ok: true };
}

// ---------------- Approvals & signatures ----------------

export async function setApprovalFlow(actor: UserDTO, contractId: string, userIds: string[]) {
  assert(can.manage(actor), "شما اجازه تعریف گردش تأیید را ندارید");
  const { approvals } = await collections();
  await approvals.deleteMany({ contract_id: contractId });
  if (userIds.length) {
    await approvals.insertMany(
      userIds.map((uid, idx) => ({
        contract_id: contractId,
        step: idx + 1,
        user_id: uid,
        status: "pending",
        note: "",
        decided_at: null,
        created_at: new Date(),
      })) as ApprovalDoc[],
    );
  }
  await log(contractId, actor.id, `گردش تأیید با ${userIds.length} مرحله تعریف شد`);
  return { ok: true };
}

export async function decideApproval(
  actor: UserDTO,
  approvalId: string,
  status: ApprovalStatus,
  note: string,
) {
  const { approvals } = await collections();
  const doc = await approvals.findOne({ _id: oid(approvalId) });
  assert(!!doc, "مرحله تأیید یافت نشد");
  assert(
    doc!.user_id === actor.id || can.admin(actor),
    "این مرحله تأیید به شما اختصاص داده نشده است",
  );
  await approvals.updateOne(
    { _id: oid(approvalId) },
    { $set: { status, note, decided_at: new Date() } },
  );
  await log(
    doc!.contract_id,
    actor.id,
    status === "approved" ? `مرحله ${doc!.step} تأیید شد` : `مرحله ${doc!.step} رد شد`,
  );
  return { ok: true };
}

export async function signContract(actor: UserDTO, contractId: string, signerTitle: string) {
  const { signatures, contracts } = await collections();
  const doc = await contracts.findOne({ _id: oid(contractId) });
  assert(!!doc, "قرارداد یافت نشد");
  assert(inScope(actor, toContract(doc!)), "دسترسی به این قرارداد ندارید");
  const already = await signatures.findOne({ contract_id: contractId, user_id: actor.id });
  assert(!already, "شما قبلاً این قرارداد را امضا کرده‌اید");
  await signatures.insertOne({
    contract_id: contractId,
    user_id: actor.id,
    signer_name: actor.full_name || actor.username,
    signer_title: signerTitle,
    created_at: new Date(),
  } as SignatureDoc);
  await contracts.updateOne(
    { _id: oid(contractId) },
    { $set: { signature_date: new Date().toISOString().slice(0, 10), updated_at: new Date() } },
  );
  await log(contractId, actor.id, "قرارداد امضا شد");
  return { ok: true };
}

// ---------------- Reports & audit ----------------

export async function reportsData(actor: UserDTO) {
  const { contracts, items, users, activity, comments } = await collections();
  const c = await contracts
    .find({ ...scopeFilter(actor), is_template: { $ne: true } })
    .toArray();
  const ids = c.map((d) => d._id.toString());
  const [i, us, ac, cm] = await Promise.all([
    items.find({ contract_id: { $in: ids } }).toArray(),
    users.find().toArray(),
    activity
      .find({ contract_id: { $in: ids } })
      .sort({ created_at: -1 })
      .limit(150)
      .toArray(),
    comments.countDocuments({ contract_id: { $in: ids } }),
  ]);
  const titles = new Map(c.map((d) => [d._id.toString(), d.title]));
  return {
    contracts: c.map(toContract),
    items: i.map(toItem),
    users: us.map(toUser),
    commentCount: cm,
    audit: ac.map((d) => ({ ...toActivity(d), contract_title: titles.get(d.contract_id) ?? "—" })),
  };
}
