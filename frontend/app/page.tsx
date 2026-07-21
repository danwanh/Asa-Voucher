"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { ROLE_HOME_PATH } from "@/services/auth.service";

export default function RootPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(ROLE_HOME_PATH[user.role]);
    } else if (status === "guest") {
      router.replace("/login");
    }
  }, [status, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Đang tải...
    </div>
  );
}
