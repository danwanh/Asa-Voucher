import { z } from "zod";
import { generateJson } from "./ai.service.js";

export type GenerateVoucherCopyInput = {
  name: string;
  category_name?: string;
  original_price?: number;
  selling_price?: number;
  validity_days?: number;
  applicable_area?: string;
  highlights?: string;
};

const lines = (max: number) =>
  z
    .array(z.string())
    .transform((items) => items.map((item) => item.trim()).filter(Boolean).slice(0, max))
    .refine((items) => items.length > 0);

// Lenient: trims/truncates instead of rejecting, limits match voucher-product.validation.ts.
const voucherCopySchema = z.object({
  description: z.string().transform((value) => value.trim().slice(0, 2000)).refine(Boolean),
  terms: lines(8),
  usage_instructions: lines(6)
});

export type VoucherCopy = z.infer<typeof voucherCopySchema>;

const SYSTEM_PROMPT = `Bạn là copywriter tiếng Việt cho Asa Voucher, sàn bán voucher điện tử.
Viết nội dung cho một voucher dựa trên thông tin partner cung cấp.

Quy tắc:
- Viết tiếng Việt tự nhiên, rõ ràng, hấp dẫn nhưng không phóng đại.
- KHÔNG bịa thông tin không có trong dữ liệu (địa chỉ, giờ mở cửa, số điện thoại, món ăn cụ thể, giá khác...).
- Không lặp lại giá tiền trong điều kiện áp dụng.
- "description": 2-4 câu, tối đa 600 ký tự.
- "terms": 3-6 điều kiện áp dụng ngắn gọn, mỗi điều kiện một câu.
- "usage_instructions": 3-5 bước sử dụng voucher (ví dụ: xuất trình mã QR cho nhân viên tại chi nhánh).

Chỉ trả về JSON đúng dạng:
{"description": string, "terms": string[], "usage_instructions": string[]}`;

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

export function buildVoucherCopyPrompt(input: GenerateVoucherCopyInput) {
  const facts = [
    `Tên voucher: ${input.name}`,
    input.category_name && `Danh mục: ${input.category_name}`,
    input.original_price && `Giá gốc: ${formatVnd(input.original_price)}`,
    input.selling_price && `Giá bán: ${formatVnd(input.selling_price)}`,
    input.original_price && input.selling_price && input.selling_price < input.original_price &&
      `Giảm: ${Math.round((1 - input.selling_price / input.original_price) * 100)}%`,
    input.validity_days && `Hạn sử dụng: ${input.validity_days} ngày kể từ ngày mua`,
    input.applicable_area && `Khu vực áp dụng: ${input.applicable_area}`,
    input.highlights && `Ý chính partner muốn nhấn mạnh: ${input.highlights}`
  ].filter(Boolean);

  return facts.join("\n");
}

export async function generateVoucherCopy(input: GenerateVoucherCopyInput): Promise<VoucherCopy> {
  return generateJson(SYSTEM_PROMPT, buildVoucherCopyPrompt(input), voucherCopySchema);
}
