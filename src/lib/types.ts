// Shared, browser-safe domain types (no database driver imports here).

export type AppRole = "admin" | "owner" | "reviewer" | "viewer";
export type ItemState = "not_started" | "in_progress" | "in_review" | "done";
export type ContractStatus = "draft" | "active" | "expired" | "terminated";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface UserDTO {
  id: string;
  username: string;
  full_name: string;
  email: string;
  city: string;
  department: string;
  roles: AppRole[];
  is_root: boolean;
  created_at: string;
}

export interface ContractDTO {
  id: string;
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
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContractItemDTO {
  id: string;
  contract_id: string;
  title: string;
  content: string;
  state: ItemState;
  position: number;
  created_by: string;
  created_at: string;
}

export interface CommentDTO {
  id: string;
  contract_id: string;
  item_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
}

export interface ActivityDTO {
  id: string;
  contract_id: string;
  contract_title?: string;
  user_id: string;
  action: string;
  created_at: string;
}

export interface AttachmentDTO {
  id: string;
  contract_id: string;
  name: string;
  content_type: string;
  size: number;
  data_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface VersionDTO {
  id: string;
  contract_id: string;
  version: number;
  note: string;
  snapshot_title: string;
  snapshot_description: string;
  created_by: string;
  created_at: string;
}

export interface SignatureDTO {
  id: string;
  contract_id: string;
  user_id: string;
  signer_name: string;
  signer_title: string;
  created_at: string;
}

export interface ApprovalDTO {
  id: string;
  contract_id: string;
  step: number;
  user_id: string;
  status: ApprovalStatus;
  note: string;
  decided_at: string | null;
  created_at: string;
}
