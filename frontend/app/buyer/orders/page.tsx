"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import { fmt, fmtDate } from "@/lib/constants";
import { listOrders, type OrderWithItems } from "@/services/order.service";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[] | null>(null);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  if (orders === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        emoji="📦"
        title="Chưa có đơn hàng"
        description="Bạn chưa đặt mua voucher nào. Hãy bắt đầu mua sắm!"
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/buyer/orders/${order.id}`}
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="font-semibold text-foreground">{order.order_code}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary">{fmt(order.total_amount)}</span>
            <StatusBadge status={order.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
