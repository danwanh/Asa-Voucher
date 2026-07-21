"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, LogOut, User } from "lucide-react";
import { useCartStore, selectCartCount } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { logout as logoutRequest } from "@/services/auth.service";

const NAV_LINKS = [
  { href: "/buyer", label: "Trang chủ" },
  { href: "/buyer/orders", label: "Đơn hàng" },
  { href: "/buyer/vouchers", label: "Voucher của tôi" }
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const cartCount = useCartStore(selectCartCount);
  const refreshCart = useCartStore((s) => s.refresh);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  async function handleLogout() {
    try {
      await logoutRequest();
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/buyer" className="font-black text-lg text-primary shrink-0">
          Asa Voucher
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/buyer/cart"
            className="relative rounded-xl p-2.5 hover:bg-muted transition-colors"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-5 w-5 text-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>

          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <User className="h-4 w-4" />
                {user.full_name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl p-2 hover:bg-muted transition-colors"
                aria-label="Đăng xuất"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

