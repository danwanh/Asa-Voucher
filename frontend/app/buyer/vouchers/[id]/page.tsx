import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AddToCartButton } from "@/features/voucher/components/AddToCartButton";
import { fmt, fmtDate } from "@/lib/constants";
import { getVoucherProduct } from "@/services/voucher.service";

interface Props {
  params: { id: string };
}

export default async function VoucherDetailPage({ params }: Props) {
  let voucher;

  try {
    voucher = await getVoucherProduct(params.id);
  } catch {
    notFound();
  }

  const isAvailable = voucher.status === "selling" && voucher.remaining_quantity > 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        {voucher.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={voucher.thumbnail_url} alt={voucher.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">🎫</div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={voucher.status} />
          {voucher.discount_rate > 0 && (
            <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
              -{voucher.discount_rate}%
            </span>
          )}
        </div>

        <h1 className="text-2xl font-black text-foreground">{voucher.name}</h1>

        <div className="flex items-end gap-3">
          <span className="text-2xl font-black text-primary">{fmt(voucher.selling_price)}</span>
          {voucher.original_price > voucher.selling_price && (
            <span className="text-base text-muted-foreground line-through">{fmt(voucher.original_price)}</span>
          )}
        </div>

        {voucher.description && <p className="text-sm text-muted-foreground">{voucher.description}</p>}

        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-4 text-sm">
          <dt className="text-muted-foreground">Số lượng còn lại</dt>
          <dd className="text-right font-semibold">{voucher.remaining_quantity}</dd>
          <dt className="text-muted-foreground">Hiệu lực sau khi mua</dt>
          <dd className="text-right font-semibold">{voucher.validity_days} ngày</dd>
          <dt className="text-muted-foreground">Bán từ</dt>
          <dd className="text-right font-semibold">{fmtDate(voucher.sale_start_date)}</dd>
          <dt className="text-muted-foreground">Bán đến</dt>
          <dd className="text-right font-semibold">{fmtDate(voucher.sale_end_date)}</dd>
        </dl>

        <AddToCartButton voucherProductId={voucher.id} disabled={!isAvailable} />
      </div>
    </div>
  );
}
