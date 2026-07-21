import { create } from "zustand";
import type { AppUser } from "@/types";

interface AuthState {
  user: AppUser | null;
  accessToken: string | null;
  status: "idle" | "loading" | "authenticated" | "guest";
  setSession: (user: AppUser, accessToken: string) => void;
  clear: () => void;
  setStatus: (status: AuthState["status"]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: "idle",
  setSession: (user, accessToken) => set({ user, accessToken, status: "authenticated" }),
  clear: () => set({ user: null, accessToken: null, status: "guest" }),
  setStatus: (status) => set({ status })
}));
