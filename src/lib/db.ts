import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

export type UserRow = {
  id: string;
  name: string;
  password_hash: string;
  password_plain?: string | null;
  must_change_password?: boolean;
  role: "admin" | "player";
  created_at: string;
};

export type AvatarPiece = {
  id: string;
  category: "helmet" | "hair" | "head" | "shirt" | "pants";
  label: string | null;
  image_data: string;
  image_back?: string | null;
  color_key?: string | null;
  quantity?: number;
  source_scan_id: string | null;
  created_at: string;
};

export type Standard = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  is_exception: boolean;
};

export type BuildSubmission = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_data: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  user_name?: string;
};
