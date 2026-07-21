"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { refreshSession } from "@/services/auth.service";

export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (status !== "idle") return;
    useAuthStore.getState().setStatus("loading");

    refreshSession()
      .then((result) => setSession(result.user, result.access_token))
      .catch(() => clear());
  }, [status, setSession, clear]);

  return <>{children}</>;
}
