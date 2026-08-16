// Shared, browser-safe domain types (no database driver imports here).

export type AppRole = "admin" | "owner" | "reviewer" | "viewer";
export type ItemState = "not_started" | "in_progress" | "in_review" | "done";
export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export interface UserDTO {
  id: string;
  username: string;
  full_name: string;
  email: string;
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
  start_date: string | null;
  end_date: string | null;
  status: ContractStatus;
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
  user_id: string;
  action: string;
  created_at: string;
}
