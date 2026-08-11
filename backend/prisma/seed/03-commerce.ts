import type { SeedContext } from "./shared.js";
import { ids, now, daysFrom, money } from "./shared.js";

type CartSeed = {
  id: string;
  user_id: string;
};

type CartItemSeed = {
  id: string;
  cart_id: string;
  voucher_product_id: string;
  quantity: number;
};

type OrderSeed = {
  id: string;
  order_code: string;
  user_id: string;
  recipient_id?: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: "vnpay" | "paypal";
  status: "pending_payment" | "payment_failed" | "confirmed" | "completed" | "cancelled" | "refunded";
  note: string;
  created_at: Date;
};

type OrderItemSeed = {
  id: string;
  order_id: string;
  voucher_product_id: string;
  quantity: number;
  unit_price: number;
  snapped_original_price: number;
  snapped_selling_price: number;
  snapped_discount_rate: number;
  subtotal: number;
  created_at: Date;
};

type PaymentSeed = {
  id: string;
  order_id: string;
  method: "vnpay" | "paypal";
  amount: number;
  status: "pending" | "success" | "failed" | "refunded";
  transaction_ref: string;
  gateway_response: string;
  paid_at?: Date;
  created_at: Date;
};

type IssuedVoucherSeed = {
  id: string;
  voucher_code: string;
  qr_code_payload: string;
  qr_code_image_url: string;
  order_item_id: string;
  voucher_product_id: string;
  owner_id: string;
  issued_date: Date;
  expired_date: Date;
  status: "active" | "used" | "expired" | "refunded";
  created_at: Date;
};

type VoucherUsageSeed = {
  id: string;
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  redemption_code: string;
  used_at: Date;
  note: string;
};

const carts: CartSeed[] = [
  { id: ids.carts.minhAnh, user_id: ids.users.buyerMinhAnh },
  { id: ids.carts.hoangNam, user_id: ids.users.buyerHoangNam },
  { id: ids.carts.giaHan, user_id: ids.users.buyerGiaHan },
  { id: ids.carts.quocBao, user_id: ids.users.buyerQuocBao }
];

const cartItems: CartItemSeed[] = [
  { id: "61000000-0000-0000-0000-000000000001", cart_id: ids.carts.minhAnh, voucher_product_id: ids.vouchers.cgvCouple, quantity: 1 },
  { id: "61000000-0000-0000-0000-000000000002", cart_id: ids.carts.minhAnh, voucher_product_id: ids.vouchers.highlandsBogo, quantity: 2 },
  { id: "61000000-0000-0000-0000-000000000003", cart_id: ids.carts.hoangNam, voucher_product_id: ids.vouchers.phucLongSizeL, quantity: 3 },
  { id: "61000000-0000-0000-0000-000000000004", cart_id: ids.carts.giaHan, voucher_product_id: ids.vouchers.karaokeKatinat, quantity: 1 },
  { id: "61000000-0000-0000-0000-000000000005", cart_id: ids.carts.quocBao, voucher_product_id: ids.vouchers.lotteCinema, quantity: 2 }
];

const orders: OrderSeed[] = [
  {
    id: ids.orders.paid01,
    order_code: "DH-20260801-0001",
    user_id: ids.users.buyerMinhAnh,
    subtotal: 318000,
    discount_amount: 49000,
    total_amount: 269000,
    payment_method: "vnpay",
    status: "completed",
    note: "Mua voucher xem phim cuối tuần",
    created_at: daysFrom(now, -15)
  },
  {
    id: ids.orders.paid02,
    order_code: "DH-20260801-0002",
    user_id: ids.users.buyerHoangNam,
    subtotal: 218000,
    discount_amount: 20000,
    total_amount: 198000,
    payment_method: "vnpay",
    status: "confirmed",
    note: "Mua voucher đồ uống trong tuần",
    created_at: daysFrom(now, -12)
  },
  {
    id: ids.orders.paid03,
    order_code: "DH-20260801-0003",
    user_id: ids.users.buyerGiaHan,
    subtotal: 429000,
    discount_amount: 30000,
    total_amount: 399000,
    payment_method: "paypal",
    status: "completed",
    note: "Buffet cuối tuần",
    created_at: daysFrom(now, -10)
  },
  {
    id: ids.orders.pending01,
    order_code: "DH-20260801-0004",
    user_id: ids.users.buyerQuocBao,
    subtotal: 229000,
    discount_amount: 0,
    total_amount: 229000,
    payment_method: "paypal",
    status: "pending_payment",
    note: "Chờ chuyển khoản",
    created_at: daysFrom(now, -5)
  },
  {
    id: ids.orders.failed01,
    order_code: "DH-20260801-0005",
    user_id: ids.users.buyerNgocLinh,
    subtotal: 160000,
    discount_amount: 0,
    total_amount: 160000,
    payment_method: "vnpay",
    status: "payment_failed",
    note: "Thanh toán thất bại do ví không đủ tiền",
    created_at: daysFrom(now, -8)
  },
  {
    id: ids.orders.refunded01,
    order_code: "DH-20260801-0006",
    user_id: ids.users.buyerThuTrang,
    subtotal: 2890000,
    discount_amount: 0,
    total_amount: 2890000,
    payment_method: "vnpay",
    status: "refunded",
    note: "Hoàn tiền do đối tác ngừng cung cấp dịch vụ",
    created_at: daysFrom(now, -25)
  },
  {
    id: ids.orders.paid04,
    order_code: "DH-20260801-0007",
    user_id: ids.users.buyerBaoVy,
    subtotal: 498000,
    discount_amount: 50000,
    total_amount: 448000,
    payment_method: "vnpay",
    status: "completed",
    note: "Combo điện ảnh cho nhóm bạn",
    created_at: daysFrom(now, -6)
  }
];

const orderItems: OrderItemSeed[] = [
  {
    id: ids.orderItems.oi01,
    order_id: ids.orders.paid01,
    voucher_product_id: ids.vouchers.cgvCouple,
    quantity: 1,
    unit_price: 249000,
    snapped_original_price: 360000,
    snapped_selling_price: 249000,
    snapped_discount_rate: 30.83,
    subtotal: 249000,
    created_at: daysFrom(now, -15)
  },
  {
    id: ids.orderItems.oi02,
    order_id: ids.orders.paid01,
    voucher_product_id: ids.vouchers.highlandsBogo,
    quantity: 1,
    unit_price: 69000,
    snapped_original_price: 118000,
    snapped_selling_price: 69000,
    snapped_discount_rate: 41.53,
    subtotal: 69000,
    created_at: daysFrom(now, -15)
  },
  {
    id: ids.orderItems.oi03,
    order_id: ids.orders.paid02,
    voucher_product_id: ids.vouchers.phucLongSizeL,
    quantity: 2,
    unit_price: 40000,
    snapped_original_price: 62000,
    snapped_selling_price: 40000,
    snapped_discount_rate: 35.48,
    subtotal: 80000,
    created_at: daysFrom(now, -12)
  },
  {
    id: ids.orderItems.oi04,
    order_id: ids.orders.paid02,
    voucher_product_id: ids.vouchers.highlandsCombo,
    quantity: 1,
    unit_price: 99000,
    snapped_original_price: 138000,
    snapped_selling_price: 99000,
    snapped_discount_rate: 28.26,
    subtotal: 99000,
    created_at: daysFrom(now, -12)
  },
  {
    id: ids.orderItems.oi05,
    order_id: ids.orders.paid03,
    voucher_product_id: ids.vouchers.gogiBuffet,
    quantity: 1,
    unit_price: 319000,
    snapped_original_price: 429000,
    snapped_selling_price: 319000,
    snapped_discount_rate: 25.64,
    subtotal: 319000,
    created_at: daysFrom(now, -10)
  },
  {
    id: ids.orderItems.oi06,
    order_id: ids.orders.pending01,
    voucher_product_id: ids.vouchers.lotteCinema,
    quantity: 1,
    unit_price: 229000,
    snapped_original_price: 330000,
    snapped_selling_price: 229000,
    snapped_discount_rate: 30.61,
    subtotal: 229000,
    created_at: daysFrom(now, -5)
  },
  {
    id: ids.orderItems.oi07,
    order_id: ids.orders.failed01,
    voucher_product_id: ids.vouchers.pizzaHutHalf,
    quantity: 1,
    unit_price: 160000,
    snapped_original_price: 320000,
    snapped_selling_price: 160000,
    snapped_discount_rate: 50,
    subtotal: 160000,
    created_at: daysFrom(now, -8)
  },
  {
    id: ids.orderItems.oi08,
    order_id: ids.orders.refunded01,
    voucher_product_id: ids.vouchers.vinpearlStay2N1D,
    quantity: 1,
    unit_price: 2890000,
    snapped_original_price: 3900000,
    snapped_selling_price: 2890000,
    snapped_discount_rate: 25.9,
    subtotal: 2890000,
    created_at: daysFrom(now, -25)
  },
  {
    id: ids.orderItems.oi09,
    order_id: ids.orders.paid04,
    voucher_product_id: ids.vouchers.cgvCouple,
    quantity: 1,
    unit_price: 249000,
    snapped_original_price: 360000,
    snapped_selling_price: 249000,
    snapped_discount_rate: 30.83,
    subtotal: 249000,
    created_at: daysFrom(now, -6)
  },
  {
    id: ids.orderItems.oi10,
    order_id: ids.orders.paid04,
    voucher_product_id: ids.vouchers.lotteCinema,
    quantity: 1,
    unit_price: 229000,
    snapped_original_price: 330000,
    snapped_selling_price: 229000,
    snapped_discount_rate: 30.61,
    subtotal: 229000,
    created_at: daysFrom(now, -6)
  }
];

const payments: PaymentSeed[] = [
  {
    id: ids.payments.paid01,
    order_id: ids.orders.paid01,
    method: "vnpay",
    amount: 269000,
    status: "success",
    transaction_ref: "MOMO-DH0001",
    gateway_response: "Thanh toán thành công",
    paid_at: daysFrom(now, -15),
    created_at: daysFrom(now, -15)
  },
  {
    id: ids.payments.paid02,
    order_id: ids.orders.paid02,
    method: "vnpay",
    amount: 198000,
    status: "success",
    transaction_ref: "VNPAY-DH0002",
    gateway_response: "Giao dịch thành công",
    paid_at: daysFrom(now, -12),
    created_at: daysFrom(now, -12)
  },
  {
    id: ids.payments.paid03,
    order_id: ids.orders.paid03,
    method: "paypal",
    amount: 399000,
    status: "success",
    transaction_ref: "ZALO-DH0003",
    gateway_response: "Thanh toán thành công",
    paid_at: daysFrom(now, -10),
    created_at: daysFrom(now, -10)
  },
  {
    id: ids.payments.pending01,
    order_id: ids.orders.pending01,
    method: "paypal",
    amount: 229000,
    status: "pending",
    transaction_ref: "BANK-DH0004",
    gateway_response: "Chờ chuyển khoản",
    created_at: daysFrom(now, -5)
  },
  {
    id: ids.payments.failed01,
    order_id: ids.orders.failed01,
    method: "vnpay",
    amount: 160000,
    status: "failed",
    transaction_ref: "MOMO-DH0005",
    gateway_response: "Không đủ số dư",
    created_at: daysFrom(now, -8)
  },
  {
    id: ids.payments.refunded01,
    order_id: ids.orders.refunded01,
    method: "vnpay",
    amount: 2890000,
    status: "refunded",
    transaction_ref: "VNPAY-DH0006",
    gateway_response: "Đã hoàn tiền về thẻ",
    paid_at: daysFrom(now, -25),
    created_at: daysFrom(now, -25)
  },
  {
    id: ids.payments.paid04,
    order_id: ids.orders.paid04,
    method: "vnpay",
    amount: 448000,
    status: "success",
    transaction_ref: "MOMO-DH0007",
    gateway_response: "Thanh toán thành công",
    paid_at: daysFrom(now, -6),
    created_at: daysFrom(now, -6)
  }
];

const issuedVouchers: IssuedVoucherSeed[] = [
  {
    id: ids.issuedVouchers.iv01,
    voucher_code: "ASA-CGV-000001",
    qr_code_payload: "qr://asa/CGV/000001",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-cgv-000001.png",
    order_item_id: ids.orderItems.oi01,
    voucher_product_id: ids.vouchers.cgvCouple,
    owner_id: ids.users.buyerMinhAnh,
    issued_date: daysFrom(now, -15),
    expired_date: daysFrom(now, 15),
    status: "used",
    created_at: daysFrom(now, -15)
  },
  {
    id: ids.issuedVouchers.iv02,
    voucher_code: "ASA-HLC-000002",
    qr_code_payload: "qr://asa/HLC/000002",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-hlc-000002.png",
    order_item_id: ids.orderItems.oi02,
    voucher_product_id: ids.vouchers.highlandsBogo,
    owner_id: ids.users.buyerMinhAnh,
    issued_date: daysFrom(now, -15),
    expired_date: daysFrom(now, 10),
    status: "active",
    created_at: daysFrom(now, -15)
  },
  {
    id: ids.issuedVouchers.iv03,
    voucher_code: "ASA-PLG-000003",
    qr_code_payload: "qr://asa/PLG/000003",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-plg-000003.png",
    order_item_id: ids.orderItems.oi03,
    voucher_product_id: ids.vouchers.phucLongSizeL,
    owner_id: ids.users.buyerHoangNam,
    issued_date: daysFrom(now, -12),
    expired_date: daysFrom(now, 3),
    status: "used",
    created_at: daysFrom(now, -12)
  },
  {
    id: ids.issuedVouchers.iv04,
    voucher_code: "ASA-HLC-000004",
    qr_code_payload: "qr://asa/HLC/000004",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-hlc-000004.png",
    order_item_id: ids.orderItems.oi04,
    voucher_product_id: ids.vouchers.highlandsCombo,
    owner_id: ids.users.buyerHoangNam,
    issued_date: daysFrom(now, -12),
    expired_date: daysFrom(now, 8),
    status: "expired",
    created_at: daysFrom(now, -12)
  },
  {
    id: ids.issuedVouchers.iv05,
    voucher_code: "ASA-GOG-000005",
    qr_code_payload: "qr://asa/GOG/000005",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-gog-000005.png",
    order_item_id: ids.orderItems.oi05,
    voucher_product_id: ids.vouchers.gogiBuffet,
    owner_id: ids.users.buyerGiaHan,
    issued_date: daysFrom(now, -10),
    expired_date: daysFrom(now, 10),
    status: "active",
    created_at: daysFrom(now, -10)
  },
  {
    id: ids.issuedVouchers.iv06,
    voucher_code: "ASA-VPR-000006",
    qr_code_payload: "qr://asa/VPR/000006",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-vpr-000006.png",
    order_item_id: ids.orderItems.oi08,
    voucher_product_id: ids.vouchers.vinpearlStay2N1D,
    owner_id: ids.users.buyerThuTrang,
    issued_date: daysFrom(now, -25),
    expired_date: daysFrom(now, 35),
    status: "refunded",
    created_at: daysFrom(now, -25)
  },
  {
    id: ids.issuedVouchers.iv07,
    voucher_code: "ASA-CGV-000007",
    qr_code_payload: "qr://asa/CGV/000007",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-cgv-000007.png",
    order_item_id: ids.orderItems.oi09,
    voucher_product_id: ids.vouchers.cgvCouple,
    owner_id: ids.users.buyerBaoVy,
    issued_date: daysFrom(now, -6),
    expired_date: daysFrom(now, 24),
    status: "active",
    created_at: daysFrom(now, -6)
  },
  {
    id: ids.issuedVouchers.iv08,
    voucher_code: "ASA-CIN-000008",
    qr_code_payload: "qr://asa/CIN/000008",
    qr_code_image_url: "https://cdn.asa.test/qr/asa-cin-000008.png",
    order_item_id: ids.orderItems.oi10,
    voucher_product_id: ids.vouchers.lotteCinema,
    owner_id: ids.users.buyerBaoVy,
    issued_date: daysFrom(now, -6),
    expired_date: daysFrom(now, 19),
    status: "active",
    created_at: daysFrom(now, -6)
  }
];

const voucherUsages: VoucherUsageSeed[] = [
  {
    id: "74000000-0000-0000-0000-000000000001",
    issued_voucher_id: ids.issuedVouchers.iv01,
    branch_id: ids.branches.cgvVincom,
    redeemed_by: ids.users.storeStaffCGVVincom,
    redemption_code: "RDM-CGV-0001",
    used_at: daysFrom(now, -13),
    note: "Khách đổi vé suất chiếu 19:30"
  },
  {
    id: "74000000-0000-0000-0000-000000000002",
    issued_voucher_id: ids.issuedVouchers.iv03,
    branch_id: ids.branches.phucLongQ3,
    redeemed_by: ids.users.storeStaffPhucLongQ3,
    redemption_code: "RDM-PL-0002",
    used_at: daysFrom(now, -11),
    note: "Đổi 2 ly trà sữa size L"
  }
];

export async function seedCommerce({ prisma }: SeedContext) {
  for (const cart of carts) {
    await prisma.cart.upsert({
      where: { id: cart.id },
      create: { ...cart, created_at: daysFrom(now, -20), updated_at: daysFrom(now, -1) },
      update: { user_id: cart.user_id, updated_at: daysFrom(now, -1) }
    });
  }

  for (const cartItem of cartItems) {
    await prisma.cartItem.upsert({
      where: { id: cartItem.id },
      create: { ...cartItem, created_at: daysFrom(now, -4), updated_at: daysFrom(now, -2) },
      update: { cart_id: cartItem.cart_id, voucher_product_id: cartItem.voucher_product_id, quantity: cartItem.quantity, updated_at: daysFrom(now, -2) }
    });
  }

  for (const order of orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      create: {
        ...order,
        recipient_id: order.recipient_id ?? order.user_id,
        subtotal: money(order.subtotal),
        discount_amount: money(order.discount_amount),
        total_amount: money(order.total_amount),
        updated_at: order.created_at
      },
      update: {
        order_code: order.order_code,
        user_id: order.user_id,
        recipient_id: order.recipient_id ?? order.user_id,
        subtotal: money(order.subtotal),
        discount_amount: money(order.discount_amount),
        total_amount: money(order.total_amount),
        payment_method: order.payment_method,
        status: order.status,
        note: order.note,
        created_at: order.created_at,
        updated_at: daysFrom(order.created_at, 1)
      }
    });
  }

  for (const item of orderItems) {
    await prisma.orderItem.upsert({
      where: { id: item.id },
      create: {
        ...item,
        unit_price: money(item.unit_price),
        snapped_original_price: money(item.snapped_original_price),
        snapped_selling_price: money(item.snapped_selling_price),
        subtotal: money(item.subtotal)
      },
      update: {
        order_id: item.order_id,
        voucher_product_id: item.voucher_product_id,
        quantity: item.quantity,
        unit_price: money(item.unit_price),
        snapped_original_price: money(item.snapped_original_price),
        snapped_selling_price: money(item.snapped_selling_price),
        snapped_discount_rate: item.snapped_discount_rate,
        subtotal: money(item.subtotal),
        created_at: item.created_at
      }
    });
  }

  for (const payment of payments) {
    await prisma.payment.upsert({
      where: { id: payment.id },
      create: {
        ...payment,
        amount: money(payment.amount)
      },
      update: {
        order_id: payment.order_id,
        method: payment.method,
        amount: money(payment.amount),
        status: payment.status,
        transaction_ref: payment.transaction_ref,
        gateway_response: payment.gateway_response,
        paid_at: payment.paid_at ?? null,
        created_at: payment.created_at
      }
    });
  }

  for (const voucher of issuedVouchers) {
    await prisma.issuedVoucher.upsert({
      where: { id: voucher.id },
      create: {
        ...voucher,
        updated_at: voucher.created_at
      },
      update: {
        voucher_code: voucher.voucher_code,
        qr_code_payload: voucher.qr_code_payload,
        qr_code_image_url: voucher.qr_code_image_url,
        order_item_id: voucher.order_item_id,
        voucher_product_id: voucher.voucher_product_id,
        owner_id: voucher.owner_id,
        issued_date: voucher.issued_date,
        expired_date: voucher.expired_date,
        status: voucher.status,
        created_at: voucher.created_at,
        updated_at: daysFrom(voucher.created_at, 1)
      }
    });
  }

  for (const usage of voucherUsages) {
    await prisma.voucherUsage.upsert({
      where: { id: usage.id },
      create: usage,
      update: usage
    });
  }
}
