// Server-only MongoDB access layer. Never import this from client code.
import "dotenv/config";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { hashPassword } from "./auth.server";

export interface UserDoc extends Document {
  username: string;
  full_name: string;
  email: string;
  city: string;
  department: string;
  password_hash: string;
  roles: string[];
  is_root: boolean;
  created_at: Date;
}

export interface ContractDoc extends Document {
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
  status: string;
  is_template: boolean;
  version: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ItemDoc extends Document {
  contract_id: string;
  title: string;
  content: string;
  state: string;
  position: number;
  created_by: string;
  created_at: Date;
}

export interface CommentDoc extends Document {
  contract_id: string;
  item_id: string | null;
  user_id: string;
  body: string;
  created_at: Date;
}

export interface ActivityDoc extends Document {
  contract_id: string;
  user_id: string;
  action: string;
  created_at: Date;
}

export interface AttachmentDoc extends Document {
  contract_id: string;
  name: string;
  content_type: string;
  size: number;
  data_url: string;
  uploaded_by: string;
  created_at: Date;
}

export interface VersionDoc extends Document {
  contract_id: string;
  version: number;
  note: string;
  snapshot_title: string;
  snapshot_description: string;
  created_by: string;
  created_at: Date;
}

export interface SignatureDoc extends Document {
  contract_id: string;
  user_id: string;
  signer_name: string;
  signer_title: string;
  created_at: Date;
}

export interface ApprovalDoc extends Document {
  contract_id: string;
  step: number;
  user_id: string;
  status: string;
  note: string;
  decided_at: Date | null;
  created_at: Date;
}

let clientPromise: Promise<MongoClient> | undefined;
let readyPromise: Promise<Db> | undefined;

function uri() {
  return process.env["MONGODB_URI"] ?? "mongodb://127.0.0.1:27017";
}

function dbName() {
  return process.env["MONGODB_DB"] ?? "clm";
}

async function connect(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri(), { serverSelectionTimeoutMS: 5000 }).connect();
  }
  const client = await clientPromise;
  return client.db(dbName());
}

async function bootstrap(db: Db): Promise<Db> {
  const users = db.collection<UserDoc>("users");
  await users.createIndex({ username: 1 }, { unique: true });
  await db.collection<ContractDoc>("contracts").createIndex({ city: 1, status: 1 });
  await db.collection<ItemDoc>("contract_items").createIndex({ contract_id: 1, position: 1 });
  await db.collection<CommentDoc>("comments").createIndex({ contract_id: 1, created_at: 1 });
  await db.collection<ActivityDoc>("activity_log").createIndex({ contract_id: 1, created_at: -1 });
  await db.collection<AttachmentDoc>("attachments").createIndex({ contract_id: 1 });
  await db.collection<VersionDoc>("contract_versions").createIndex({ contract_id: 1, version: -1 });
  await db.collection<SignatureDoc>("signatures").createIndex({ contract_id: 1 });
  await db.collection<ApprovalDoc>("approvals").createIndex({ contract_id: 1, step: 1 });

  const rootUsername = process.env["ROOT_USERNAME"] ?? "root";
  const rootPassword = process.env["ROOT_PASSWORD"] ?? "1ye@XH55";
  const existing = await users.findOne({ username: rootUsername });
  if (!existing) {
    await users.insertOne({
      username: rootUsername,
      full_name: "مدیر ارشد سیستم",
      email: process.env["ROOT_EMAIL"] ?? `${rootUsername}@local`,
      city: "تهران",
      department: "مدیریت",
      password_hash: await hashPassword(rootPassword),
      roles: ["admin"],
      is_root: true,
      created_at: new Date(),
    } as UserDoc);
    console.info(`[db] Root user "${rootUsername}" created.`);
  }
  return db;
}

export async function getDb(): Promise<Db> {
  if (!readyPromise) {
    readyPromise = connect()
      .then(bootstrap)
      .catch((error: unknown) => {
        readyPromise = undefined;
        clientPromise = undefined;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `اتصال به پایگاه‌داده MongoDB برقرار نشد (${uri()}). سرویس MongoDB را اجرا کنید. جزئیات: ${message}`,
        );
      });
  }
  return readyPromise;
}

export async function collections(): Promise<{
  users: Collection<UserDoc>;
  contracts: Collection<ContractDoc>;
  items: Collection<ItemDoc>;
  comments: Collection<CommentDoc>;
  activity: Collection<ActivityDoc>;
  attachments: Collection<AttachmentDoc>;
  versions: Collection<VersionDoc>;
  signatures: Collection<SignatureDoc>;
  approvals: Collection<ApprovalDoc>;
}> {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    contracts: db.collection<ContractDoc>("contracts"),
    items: db.collection<ItemDoc>("contract_items"),
    comments: db.collection<CommentDoc>("comments"),
    activity: db.collection<ActivityDoc>("activity_log"),
    attachments: db.collection<AttachmentDoc>("attachments"),
    versions: db.collection<VersionDoc>("contract_versions"),
    signatures: db.collection<SignatureDoc>("signatures"),
    approvals: db.collection<ApprovalDoc>("approvals"),
  };
}
