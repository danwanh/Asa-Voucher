"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { logout as logoutRequest } from "@/services/auth.service";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  title: string;
  navItems: DashboardNavItem[];
  children: React.ReactNode;
}

export function DashboardShell({ title, navItems, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center px-6">
          <span className="font-black text-primary">{title}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <span className="font-semibold text-foreground md:hidden">{title}</span>
          <span className="hidden text-sm text-muted-foreground md:inline">Xin chào, {user?.full_name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
