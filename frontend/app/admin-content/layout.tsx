"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, FolderTree, ShieldCheck } from "lucide-react";
import { RequireRole } from "@/components/common/RequireRole";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin-content", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin-content/categories", label: "Danh mục", icon: FolderTree },
  { href: "/admin-content/approvals", label: "Duyệt voucher", icon: ShieldCheck }
];

export default function AdminContentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["admin_content"]}>
      <DashboardShell title="Quản trị Nội dung" navItems={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
