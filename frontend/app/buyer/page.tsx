import { VoucherCard } from "@/features/voucher/components/VoucherCard";
import { EmptyData } from "@/components/common/EmptyState";
import { listVoucherProducts } from "@/services/voucher.service";

export default async function BuyerHomePage() {
  let vouchers: Awaited<ReturnType<typeof listVoucherProducts>>["items"] = [];

  try {
    vouchers = (await listVoucherProducts()).items;
  } catch {
    vouchers = [];
  }

  if (vouchers.length === 0) {
    return <EmptyData message="Chưa có voucher nào đang bán. Quay lại sau nhé!" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {vouchers.map((voucher) => (
        <VoucherCard key={voucher.id} voucher={voucher} />
      ))}
    </div>
  );
}

