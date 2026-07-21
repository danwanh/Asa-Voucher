"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, ScrollText } from "lucide-react";
import { RequireRole } from "@/components/common/RequireRole";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin-security", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin-security/logs", label: "Nhật ký", icon: ScrollText }
];

export default function AdminSecurityLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["admin_security"]}>
      <DashboardShell title="Quản trị Bảo mật" navItems={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
