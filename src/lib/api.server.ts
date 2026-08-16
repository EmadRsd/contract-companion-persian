// Server-only business logic backed by MongoDB.
import { ObjectId, type WithId } from "mongodb";
import { collections, type ActivityDoc, type CommentDoc, type ContractDoc, type ItemDoc, type UserDoc } from "./db.server";
import { hashPassword, signToken, verifyPassword } from "./auth.server";
import type {
  ActivityDTO,
  AppRole,
  CommentDTO,
  ContractDTO,
  ContractItemDTO,
  ContractStatus,
  ItemState,
  UserDTO,
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
    start_date: doc.start_date ?? null,
    end_date: doc.end_date ?? null,
    status: doc.status as ContractStatus,
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

export async function listUsers(actor: UserDTO): Promise<UserDTO[]> {
  assert(can.admin(actor), "فقط مدیر سیستم به این بخش دسترسی دارد");
  const { users } = await collections();
  return (await users.find().sort({ created_at: 1 }).toArray()).map(toUser);
}

export async function createUser(
  actor: UserDTO,
  input: { username: string; password: string; full_name: string; email: string; roles: AppRole[] },
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
  await users.updateOne({ _id: oid(userId) }, { $set: { roles: clean.length ? clean : ["viewer"] } });
  return { ok: true };
}

export async function setUserPassword(actor: UserDTO, userId: string, password: string) {
  assert(can.admin(actor), "فقط مدیر سیستم می‌تواند رمز عبور را تغییر دهد");
  assert(password.length >= 6, "رمز عبور باید حداقل ۶ نویسه باشد");
  const { users } = await collections();
  await users.updateOne({ _id: oid(userId) }, { $set: { password_hash: await hashPassword(password) } });
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

export async function listContracts() {
  const { contracts, items } = await collections();
  const [c, i] = await Promise.all([
    contracts.find().sort({ created_at: -1 }).toArray(),
    items.find().toArray(),
  ]);
  return { contracts: c.map(toContract), items: i.map(toItem) };
}

export async function dashboardData() {
  const { contracts, items, comments } = await collections();
  const [c, i, commentCount] = await Promise.all([
    contracts.find().sort({ updated_at: -1 }).limit(200).toArray(),
    items.find().toArray(),
    comments.countDocuments(),
  ]);
  return { contracts: c.map(toContract), items: i.map(toItem), commentCount };
}

export async function getContract(contractId: string) {
  const { contracts, items, comments, activity, users } = await collections();
  const contract = await contracts.findOne({ _id: oid(contractId) });
  if (!contract) return null;
  const [i, cm, ac, us] = await Promise.all([
    items.find({ contract_id: contractId }).sort({ position: 1 }).toArray(),
    comments.find({ contract_id: contractId }).sort({ created_at: 1 }).toArray(),
    activity.find({ contract_id: contractId }).sort({ created_at: -1 }).limit(40).toArray(),
    users.find().toArray(),
  ]);
  return {
    contract: toContract(contract),
    items: i.map(toItem),
    comments: cm.map(toComment),
    activity: ac.map(toActivity),
    users: us.map(toUser),
  };
}

async function log(contractId: string, userId: string, action: string) {
  const { activity } = await collections();
  await activity.insertOne({ contract_id: contractId, user_id: userId, action, created_at: new Date() } as ActivityDoc);
}

export async function createContract(
  actor: UserDTO,
  input: {
    title: string;
    counterparty: string;
    description: string;
    value: number;
    start_date: string | null;
    end_date: string | null;
    status: ContractStatus;
  },
) {
  assert(can.manage(actor), "شما اجازه ایجاد قرارداد ندارید");
  const { contracts } = await collections();
  const now = new Date();
  const res = await contracts.insertOne({
    ...input,
    created_by: actor.id,
    created_at: now,
    updated_at: now,
  } as ContractDoc);
  await log(res.insertedId.toString(), actor.id, `قرارداد «${input.title}» ایجاد شد`);
  return { id: res.insertedId.toString() };
}

export async function updateContractStatus(actor: UserDTO, contractId: string, status: ContractStatus, label: string) {
  assert(can.manage(actor), "شما اجازه تغییر وضعیت قرارداد را ندارید");
  const { contracts } = await collections();
  await contracts.updateOne({ _id: oid(contractId) }, { $set: { status, updated_at: new Date() } });
  await log(contractId, actor.id, `وضعیت قرارداد به «${label}» تغییر کرد`);
  return { ok: true };
}

export async function deleteContract(actor: UserDTO, contractId: string) {
  assert(can.manage(actor), "شما اجازه حذف قرارداد را ندارید");
  const { contracts, items, comments, activity } = await collections();
  await Promise.all([
    contracts.deleteOne({ _id: oid(contractId) }),
    items.deleteMany({ contract_id: contractId }),
    comments.deleteMany({ contract_id: contractId }),
    activity.deleteMany({ contract_id: contractId }),
  ]);
  return { ok: true };
}

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

export async function setItemState(actor: UserDTO, itemId: string, state: ItemState, label: string) {
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
  assert(can.state(actor), "نقش شما اجازه ثبت نظر ندارد");
  assert(body.trim().length > 0, "متن پیام خالی است");
  const { comments } = await collections();
  await comments.insertOne({
    contract_id: contractId,
    item_id: itemId,
    user_id: actor.id,
    body: body.trim(),
    created_at: new Date(),
  } as CommentDoc);
  return { ok: true };
}
