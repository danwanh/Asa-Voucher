"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, Ticket, Building2, ClipboardList } from "lucide-react";
import { RequireRole } from "@/components/common/RequireRole";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/partner-owner", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/partner-owner/vouchers", label: "Voucher", icon: Ticket },
  { href: "/partner-owner/branches", label: "Chi nhánh", icon: Building2 },
  { href: "/partner-owner/orders", label: "Đơn hàng", icon: ClipboardList }
];

export default function PartnerOwnerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["partner_owner"]}>
      <DashboardShell title="Đối tác" navItems={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
