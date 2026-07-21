"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, QrCode } from "lucide-react";
import { RequireRole } from "@/components/common/RequireRole";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/partner-store-staff", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/partner-store-staff/redeem", label: "Đổi voucher", icon: QrCode }
];

export default function PartnerStoreStaffLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["partner_store_staff"]}>
      <DashboardShell title="Nhân viên cửa hàng" navItems={NAV_ITEMS}>
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
