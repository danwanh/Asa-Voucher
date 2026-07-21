"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, Ticket } from "lucide-react";
import { RequireRole } from "@/components/common/RequireRole";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/partner-voucher-staff", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/partner-voucher-staff/vouchers", label: "Voucher", icon: Ticket }
];

export default function PartnerVoucherStaffLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["partner_voucher_staff"]}>
      <DashboardShell title="Nhân viên Voucher" navItems={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
