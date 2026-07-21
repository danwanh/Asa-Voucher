"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserRole } from "@/types";

interface Props {
  roles: UserRole[];
  children: ReactNode;
}

export function RequireRole({ roles, children }: Props) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
    } else if (status === "authenticated" && user && !roles.includes(user.role)) {
      router.replace("/login");
    }
  }, [status, user, roles, router]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (status !== "authenticated" || !user || !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
