import { api } from "./api";
import type { AppUser } from "@/types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

interface LoginResult {
  access_token: string;
  user: AppUser;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  city?: string;
  district?: string;
  address?: string;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<ApiEnvelope<LoginResult>>("/auth/login", { email, password });
  return data.data;
}

export async function register(input: RegisterInput) {
  const { data } = await api.post<ApiEnvelope<AppUser>>("/auth/register", input);
  return data.data;
}

export async function refreshSession() {
  const { data } = await api.post<ApiEnvelope<LoginResult>>("/auth/refresh");
  return data.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function me() {
  const { data } = await api.get<ApiEnvelope<AppUser>>("/auth/me");
  return data.data;
}

export const ROLE_HOME_PATH: Record<AppUser["role"], string> = {
  buyer: "/buyer",
  partner_owner: "/partner-owner",
  partner_voucher_staff: "/partner-voucher-staff",
  partner_store_staff: "/partner-store-staff",
  admin_content: "/admin-content",
  admin_account: "/admin-account",
  admin_security: "/admin-security"
};
