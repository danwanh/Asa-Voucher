import type { UserRole } from "./role";

export interface AppUser {
  id: string;
  email: string;
  phone?: string | null;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  is_active: boolean;
  is_verified: boolean;
  partner_branches_id?: string | null;
  created_at: string;
  updated_at: string;
}
