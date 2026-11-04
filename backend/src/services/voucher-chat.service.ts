import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { getAreaMatchCandidates, normalizeAreaName } from "../utils/applicable-area.js";
import { generateJson } from "./ai.service.js";
import { getPublicVoucherWhere } from "./voucher-product.service.js";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type CategoryInfo = { id: string; name: string; parent_id: string | null };

const RESULT_LIMIT = 6;
const CANDIDATE_LIMIT = 30;
const CONTEXT_TTL_MS = 5 * 60 * 1000;
const SORTS = ["relevance", "discount", "price_asc", "rating", "newest"] as const;

// Lenient on purpose: bad values from the model are dropped instead of failing the whole request.
const filtersSchema = z.object({
  reply: z.string().catch("").transform((value) => value.trim().slice(0, 500)),
  search: z.boolean().catch(true),
  category_ids: z.array(z.string()).catch([]).transform((ids) => ids.slice(0, 5)),
  keywords: z
    .array(z.string())
    .catch([])
    .transform((items) => items.map((item) => item.trim()).filter((item) => item.length >= 2).slice(0, 5)),
  area: z.string().nullish().catch(null),
  max_price: z.number().positive().nullish().catch(null),
  min_discount: z.number().min(0).max(100).nullish().catch(null),
  sort: z.enum(SORTS).catch("relevance")
});

export type ChatFilters = z.infer<typeof filtersSchema>;

let contextCache: { at: number; categories: CategoryInfo[]; areas: string[] } | null = null;

async function getSearchContext() {
  if (contextCache && Date.now() - contextCache.at < CONTEXT_TTL_MS) return contextCache;

  const [categories, branches] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, parent_id: true }, orderBy: { sort_order: "asc" } }),
    prisma.partnerBranch.findMany({ where: { is_active: true }, select: { city: true }, distinct: ["city"] })
  ]);
  const areas = Array.from(new Set(branches.map((branch) => normalizeAreaName(branch.city)).filter(Boolean)));
  contextCache = { at: Date.now(), categories, areas };
  return contextCache;
}

export function resetVoucherChatCache() {
  contextCache = null;
}

const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")}đ`;

export function buildSystemPrompt(categories: CategoryInfo[], areas: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  const categoryLines = categories
    .map((category) => `- ${category.id}: ${category.name}${category.parent_id ? " (danh mục con)" : ""}`)
    .join("\n");

  return `Bạn là trợ lý tìm voucher của Asa Voucher, sàn bán voucher điện tử ở Việt Nam. Hôm nay là ${today}.
Nhiệm vụ: đọc hội thoại, hiểu người dùng muốn tìm voucher gì, rồi trả về BỘ LỌC dạng JSON. Hệ thống sẽ tự tìm trong cơ sở dữ liệu và hiển thị kết quả ngay sau câu "reply" của bạn.

Danh mục (id: tên):
${categoryLines}

Khu vực đang có voucher: ${areas.join(", ") || "(chưa có)"}

Trả về JSON đúng dạng:
{
  "reply": string,          // 1-2 câu tiếng Việt thân thiện, mở đầu cho danh sách kết quả. KHÔNG nêu tên voucher, giá hay số lượng cụ thể vì bạn chưa thấy kết quả.
  "search": boolean,        // false nếu người dùng chỉ chào hỏi / hỏi ngoài chủ đề voucher; khi đó "reply" trả lời ngắn và gợi ý họ mô tả voucher muốn tìm.
  "category_ids": string[], // id danh mục phù hợp nhất, lấy từ danh sách trên. Để [] nếu không rõ.
  "keywords": string[],     // 0-3 từ khoá cụ thể có thể xuất hiện trong tên voucher hoặc tên thương hiệu (vd: "lẩu", "pizza", "CGV"). Không dùng từ chung chung như "voucher", "giảm giá", "đồ ăn".
  "area": string | null,    // một khu vực trong danh sách trên, hoặc null
  "max_price": number | null,   // giá bán tối đa (VND), vd "dưới 300k" -> 300000
  "min_discount": number | null, // % giảm tối thiểu, vd "giảm từ 30%" -> 30
  "sort": "relevance" | "discount" | "price_asc" | "rating" | "newest"
}

Quy tắc:
- Câu hỏi tiếp theo (vd "rẻ hơn", "ở Đà Nẵng thì sao") thì giữ các điều kiện cũ trong hội thoại và chỉ đổi phần được nhắc tới.
- Nếu danh mục đã thể hiện đủ ý (vd "spa", "karaoke", "buffet") thì để "keywords" rỗng; chỉ thêm từ khoá khi người dùng nói món/thương hiệu cụ thể.
- Từ khoá có thể viết bằng tiếng Anh nếu thương hiệu thường dùng tên tiếng Anh (vd "cà phê" -> "coffee").
- "rẻ nhất" -> sort "price_asc"; "giảm nhiều nhất" -> "discount"; "được đánh giá cao" -> "rating"; "mới" -> "newest".
- Không bịa thông tin về voucher, quán, giá hay địa chỉ.`;
}

function expandCategoryIds(ids: string[], categories: CategoryInfo[]) {
  const known = new Set(categories.map((category) => category.id));
  const selected = new Set(ids.filter((id) => known.has(id)));
  // Picking a parent category also matches its children
  for (const category of categories) {
    if (category.parent_id && selected.has(category.parent_id)) selected.add(category.id);
  }
  return Array.from(selected);
}

function buildWhere(filters: ChatFilters, categoryIds: string[], useKeywords: boolean): Prisma.VoucherProductWhereInput {
  const and: Prisma.VoucherProductWhereInput[] = [getPublicVoucherWhere() as Prisma.VoucherProductWhereInput];

  if (categoryIds.length > 0) and.push({ category_id: { in: categoryIds } });
  if (filters.max_price) and.push({ selling_price: { lte: filters.max_price } });
  if (filters.min_discount) and.push({ discount_rate: { gte: filters.min_discount } });

  if (filters.area) {
    const candidates = getAreaMatchCandidates(filters.area);
    if (candidates.length > 0) {
      and.push({
        voucher_product_branches: {
          some: { partner_branches: { OR: candidates.map((city) => ({ city: { equals: city, mode: "insensitive" as const } })) } }
        }
      });
    }
  }

  if (useKeywords && filters.keywords.length > 0) {
    and.push({
      OR: filters.keywords.flatMap((keyword) => [
        { name: { contains: keyword, mode: "insensitive" as const } },
        { description: { contains: keyword, mode: "insensitive" as const } },
        { partners: { business_name: { contains: keyword, mode: "insensitive" as const } } }
      ])
    });
  }

  return { AND: and };
}

const voucherSelect = {
  id: true,
  name: true,
  category_id: true,
  selling_price: true,
  original_price: true,
  discount_rate: true,
  applicable_area: true,
  thumbnail_url: true,
  created_at: true,
  partners: { select: { business_name: true } },
  voucher_product_images: { select: { image_url: true }, orderBy: { sort_order: "asc" as const }, take: 1 }
} satisfies Prisma.VoucherProductSelect;

export type ChatVoucher = {
  id: string;
  name: string;
  category_id: string;
  partner_name: string | null;
  selling_price: number;
  original_price: number;
  discount_rate: number;
  applicable_area: string | null;
  image_url: string | null;
  average_rating: number;
  review_count: number;
};

export async function searchVouchers(filters: ChatFilters, categories: CategoryInfo[]) {
  const categoryIds = expandCategoryIds(filters.category_ids, categories);
  const find = (useKeywords: boolean) =>
    prisma.voucherProduct.findMany({
      where: buildWhere(filters, categoryIds, useKeywords),
      select: voucherSelect,
      orderBy: filters.sort === "price_asc" ? { selling_price: "asc" } : filters.sort === "discount" ? { discount_rate: "desc" } : { created_at: "desc" },
      take: CANDIDATE_LIMIT
    });

  let items = await find(true);
  let relaxed = false;
  // Keywords are the most fragile filter (exact substring). If they match nothing but a category
  // was understood, show the category's vouchers instead of an empty answer.
  if (items.length === 0 && filters.keywords.length > 0 && categoryIds.length > 0) {
    items = await find(false);
    relaxed = items.length > 0;
  }

  const stats = items.length
    ? await prisma.review.groupBy({
      by: ["voucher_product_id"],
      where: { voucher_product_id: { in: items.map((item) => item.id) }, is_published: true },
      _avg: { rating: true },
      _count: { _all: true }
    })
    : [];
  const statsById = new Map(stats.map((stat) => [stat.voucher_product_id, stat]));

  let vouchers: ChatVoucher[] = items.map((item) => {
    const stat = statsById.get(item.id);
    return {
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      partner_name: item.partners?.business_name ?? null,
      selling_price: Number(item.selling_price),
      original_price: Number(item.original_price),
      discount_rate: item.discount_rate,
      applicable_area: item.applicable_area,
      image_url: item.voucher_product_images[0]?.image_url ?? item.thumbnail_url ?? null,
      average_rating: Number((stat?._avg.rating ?? 0).toFixed(1)),
      review_count: stat?._count._all ?? 0
    };
  });

  if (filters.sort === "rating") {
    vouchers = [...vouchers].sort((a, b) => b.average_rating - a.average_rating || b.review_count - a.review_count);
  }

  return { vouchers: vouchers.slice(0, RESULT_LIMIT), relaxed };
}

function describeFilters(filters: ChatFilters, categories: CategoryInfo[]) {
  const parts: string[] = [];
  const names = filters.category_ids
    .map((id) => categories.find((category) => category.id === id)?.name)
    .filter(Boolean);
  if (names.length) parts.push(names.join(", ").toLowerCase());
  if (filters.keywords.length) parts.push(`"${filters.keywords.join(", ")}"`);
  if (filters.area) parts.push(`ở ${normalizeAreaName(filters.area)}`);
  if (filters.max_price) parts.push(`dưới ${formatVnd(filters.max_price)}`);
  if (filters.min_discount) parts.push(`giảm từ ${filters.min_discount}%`);
  return parts.join(" ");
}

export async function chatAboutVouchers(messages: ChatMessage[]) {
  const { categories, areas } = await getSearchContext();
  const filters = await generateJson(buildSystemPrompt(categories, areas), formatConversation(messages), filtersSchema, {
    preferredModel: env.AI_CHAT_MODEL
  });

  if (!filters.search) {
    return {
      reply: filters.reply || "Bạn muốn tìm voucher gì? Ví dụ: \"buffet ở Hà Nội dưới 300k\" hoặc \"spa giảm nhiều nhất\".",
      vouchers: [] as ChatVoucher[],
      filters: null
    };
  }

  const { vouchers, relaxed } = await searchVouchers(filters, categories);
  const described = describeFilters(filters, categories);

  let reply = filters.reply || "Đây là một số voucher phù hợp với bạn:";
  if (vouchers.length === 0) {
    reply = `Hiện chưa có voucher nào phù hợp${described ? ` với ${described}` : ""}. Bạn thử nới điều kiện (khu vực khác, giá cao hơn) hoặc mô tả theo cách khác nhé.`;
  } else if (relaxed) {
    reply = `Mình không tìm thấy voucher khớp chính xác với "${filters.keywords.join(", ")}", đây là các voucher cùng loại bạn có thể tham khảo:`;
  }

  return { reply, vouchers, filters };
}

/** Sends the last turns as plain text; the model only needs recent context to resolve follow-ups. */
function formatConversation(messages: ChatMessage[]) {
  return messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Người dùng" : "Trợ lý"}: ${message.content}`)
    .join("\n");
}
