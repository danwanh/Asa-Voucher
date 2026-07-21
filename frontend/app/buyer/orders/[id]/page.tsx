"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Skeleton } from "@/components/common/Skeleton";
import { fmt, fmtDate } from "@/lib/constants";
import { getOrder, cancelOrder, type OrderWithItems } from "@/services/order.service";

interface Props {
  params: { id: string };
}

export default function OrderDetailPage({ params }: Props) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getOrder(params.id)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [params.id]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await cancelOrder(params.id);
      setOrder(updated);
      toast.success("Đã huỷ đơn hàng");
    } catch {
      toast.error("Không thể huỷ đơn hàng");
    } finally {
      setCancelling(false);
    }
  }

  if (order === null) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground">{order.order_code}</h1>
          <p className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-foreground">Số lượng: {item.quantity}</p>
              <p className="text-xs text-muted-foreground">Đơn giá: {fmt(item.unit_price)}</p>
            </div>
            <span className="font-bold text-primary">{fmt(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tạm tính</span>
          <span>{fmt(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Giảm giá</span>
          <span>-{fmt(order.discount_amount)}</span>
        </div>
        <div className="flex justify-between text-base font-black">
          <span>Tổng cộng</span>
          <span className="text-primary">{fmt(order.total_amount)}</span>
        </div>
      </div>

      {order.status === "pending" && (
        <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
          {cancelling ? "Đang huỷ..." : "Huỷ đơn hàng"}
        </Button>
      )}
    </div>
  );
}
