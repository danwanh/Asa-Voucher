"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, Users, Building2 } from "lucide-react";
import { RequireRole } from "@/components/common/RequireRole";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin-account", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin-account/users", label: "Người dùng", icon: Users },
  { href: "/admin-account/partners", label: "Đối tác", icon: Building2 }
];

export default function AdminAccountLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["admin_account"]}>
      <DashboardShell title="Quản trị Tài khoản" navItems={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
