/**
 * Bulk seed: sinh dữ liệu quy mô lớn nhưng nhất quán với nghiệp vụ thật.
 *
 * Mô phỏng theo đúng luồng của backend (commerce.service / issued-voucher.service):
 * - Voucher chỉ bán được khi đã duyệt, trong thời gian bán, đối tác đang hoạt động và còn tồn kho.
 * - Tồn kho chỉ giảm khi thanh toán thành công; đơn bị hủy/hoàn tiền trả lại tồn kho và mã bị thu hồi (revoked).
 * - Mỗi đơn vị mua sinh 1 mã voucher (VC<timestamp><6 số>), hạn dùng = ngày phát hành + validity_days.
 * - Mã chỉ được đổi tại chi nhánh áp dụng, bởi nhân viên của chi nhánh đó; đổi hết mã thì đơn chuyển "completed".
 * - Đơn không thanh toán trong 15 phút bị job hủy (CANCEL_ORDER_EXPIRED).
 * - Đánh giá chỉ có trên mã đã sử dụng, do chủ sở hữu mã viết sau thời điểm sử dụng.
 *
 * Bất biến: remaining_quantity = total_quantity - số mã ở trạng thái active/used/expired.
 * Dữ liệu sinh ngẫu nhiên có seed cố định nên chạy lại cho cùng kết quả (theo ngày chạy).
 */
import { Prisma } from "@prisma/client";
import type { SeedContext } from "./shared.js";
import { ids } from "./shared.js";

// ───────────────────────────── Cấu hình quy mô ─────────────────────────────

const HISTORY_DAYS = 365;
const BUYER_COUNT = 1600;
const PRODUCT_SCALE = 1.2; // nhân với số voucher cấu hình cho từng đối tác
const ORDERS_PER_DAY_START = 14;
const ORDERS_PER_DAY_END = 46;
const CART_COUNT = 300;
const CHUNK_SIZE = 1000;

// ───────────────────────────── Tiện ích thời gian & ngẫu nhiên ─────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TZ_OFFSET = 7 * HOUR; // Asia/Ho_Chi_Minh

const NOW = new Date();
const TODAY = Math.floor((NOW.getTime() + TZ_OFFSET) / DAY); // số ngày (giờ VN) kể từ epoch
const FIRST_DAY = TODAY - HISTORY_DAYS;

/** Giá trị cho cột @db.Date (nửa đêm UTC của ngày theo giờ VN). */
const dateOf = (day: number) => new Date(day * DAY);
/** Thời điểm cụ thể: ngày theo giờ VN + giờ địa phương (có thể lẻ). */
const at = (day: number, localHour: number) => new Date(day * DAY - TZ_OFFSET + localHour * HOUR);
const dayOf = (instant: number) => Math.floor((instant + TZ_OFFSET) / DAY);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261002);
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const between = (min: number, max: number) => min + rand() * (max - min);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
function weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function gaussian() {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
/** Giờ trong ngày theo hành vi mua sắm (tập trung trưa và tối). */
const shoppingHour = () => Math.min(23.9, weighted([[8, 1], [10, 2], [12, 4], [14, 2], [17, 3], [20, 5], [22, 2]] as const) + rand() * 2);

const roundThousand = (value: number) => Math.round(value / 1000) * 1000;
const pad = (value: number, length: number) => String(value).padStart(length, "0");
const ascii = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
const slugify = (value: string) => ascii(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** UUID tất định: tiền tố 2 ký tự hex theo bảng + số thứ tự. */
function makeId(prefix: string, n: number) {
  return `${prefix}000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}
const counters: Record<string, number> = {};
const nextId = (prefix: string) => makeId(prefix, (counters[prefix] = (counters[prefix] ?? 0) + 1));

async function insertChunks<T>(label: string, rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await insert(rows.slice(i, i + CHUNK_SIZE));
  }
  console.log(`  • ${label}: ${rows.length.toLocaleString("vi-VN")}`);
}

// ───────────────────────────── Dữ liệu tham chiếu ─────────────────────────────

const FAMILY_NAMES = [
  ["Nguyễn", 30], ["Trần", 11], ["Lê", 9], ["Phạm", 7], ["Hoàng", 5], ["Huỳnh", 5], ["Phan", 4], ["Vũ", 4],
  ["Võ", 4], ["Đặng", 3], ["Bùi", 3], ["Đỗ", 3], ["Hồ", 2], ["Ngô", 2], ["Dương", 2], ["Lý", 1]
] as const;
const MALE_MIDDLE = ["Văn", "Hữu", "Đức", "Minh", "Quốc", "Thành", "Gia", "Hoàng", "Anh", "Trọng"];
const FEMALE_MIDDLE = ["Thị", "Ngọc", "Thu", "Thanh", "Mỹ", "Khánh", "Bảo", "Phương", "Minh", "Hoài"];
const MALE_GIVEN = [
  "Anh", "Bảo", "Cường", "Dũng", "Duy", "Hải", "Hiếu", "Hoàng", "Huy", "Khang", "Khoa", "Kiên", "Long", "Lộc", "Minh",
  "Nam", "Nghĩa", "Phong", "Phúc", "Quân", "Sơn", "Tài", "Thắng", "Thịnh", "Tiến", "Trí", "Trung", "Tuấn", "Việt", "Vinh"
];
const FEMALE_GIVEN = [
  "An", "Anh", "Châu", "Chi", "Diệp", "Dung", "Giang", "Hà", "Hạnh", "Hằng", "Hân", "Hương", "Lan", "Linh", "Ly", "Mai",
  "My", "Ngân", "Nhi", "Nhung", "Oanh", "Phương", "Quyên", "Tâm", "Thảo", "Thư", "Trang", "Trinh", "Uyên", "Vy", "Yến"
];

type CityKey = "hcm" | "hn" | "dn" | "ct" | "hp" | "nt" | "dl" | "pq" | "qn";
type CityInfo = { name: string; districts: string[]; streets: string[]; lat: number; lng: number; areaCode: string };

const CITIES: Record<CityKey, CityInfo> = {
  hcm: {
    name: "TP. Hồ Chí Minh",
    districts: ["Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận 10", "Bình Thạnh", "Phú Nhuận", "Tân Bình", "Gò Vấp", "Thủ Đức"],
    streets: ["Nguyễn Huệ", "Lê Lợi", "Hai Bà Trưng", "Nguyễn Thị Minh Khai", "Võ Văn Tần", "Cách Mạng Tháng 8", "Phan Xích Long", "Nguyễn Văn Linh", "Điện Biên Phủ", "Lê Văn Sỹ", "Quang Trung", "Võ Văn Ngân"],
    lat: 10.7769, lng: 106.7009, areaCode: "028"
  },
  hn: {
    name: "Hà Nội",
    districts: ["Hoàn Kiếm", "Ba Đình", "Đống Đa", "Cầu Giấy", "Hai Bà Trưng", "Tây Hồ", "Thanh Xuân", "Nam Từ Liêm"],
    streets: ["Tràng Tiền", "Hàng Bài", "Kim Mã", "Xã Đàn", "Trần Duy Hưng", "Bà Triệu", "Xuân Diệu", "Nguyễn Trãi", "Phạm Hùng", "Láng Hạ"],
    lat: 21.0285, lng: 105.8542, areaCode: "024"
  },
  dn: {
    name: "Đà Nẵng",
    districts: ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn"],
    streets: ["Bạch Đằng", "Trần Phú", "Nguyễn Văn Linh", "Võ Nguyên Giáp", "Lê Duẩn", "Hoàng Sa"],
    lat: 16.0544, lng: 108.2022, areaCode: "0236"
  },
  ct: {
    name: "Cần Thơ",
    districts: ["Ninh Kiều", "Cái Răng"],
    streets: ["Hai Bà Trưng", "30 Tháng 4", "Trần Hưng Đạo", "Mậu Thân"],
    lat: 10.0452, lng: 105.7469, areaCode: "0292"
  },
  hp: {
    name: "Hải Phòng",
    districts: ["Lê Chân", "Ngô Quyền", "Hồng Bàng"],
    streets: ["Lạch Tray", "Văn Cao", "Điện Biên Phủ", "Tô Hiệu"],
    lat: 20.8449, lng: 106.6881, areaCode: "0225"
  },
  nt: {
    name: "Nha Trang",
    districts: ["Lộc Thọ", "Vĩnh Nguyên", "Phước Hải"],
    streets: ["Trần Phú", "Phạm Văn Đồng", "Nguyễn Thị Minh Khai"],
    lat: 12.2388, lng: 109.1967, areaCode: "0258"
  },
  dl: {
    name: "Đà Lạt",
    districts: ["Phường 1", "Phường 3", "Phường 8"],
    streets: ["Trần Hưng Đạo", "Hồ Tùng Mậu", "Phan Đình Phùng"],
    lat: 11.9404, lng: 108.4583, areaCode: "0263"
  },
  pq: {
    name: "Phú Quốc",
    districts: ["Dương Đông", "Gành Dầu"],
    streets: ["Trần Hưng Đạo", "Đường Bào"],
    lat: 10.2899, lng: 103.984, areaCode: "0297"
  },
  qn: {
    name: "Quảng Ninh",
    districts: ["Hạ Long"],
    streets: ["Hạ Long", "Trần Quốc Nghiễn"],
    lat: 20.9517, lng: 107.0791, areaCode: "0203"
  }
};

const BUYER_CITY_WEIGHTS = [["hcm", 44], ["hn", 34], ["dn", 9], ["ct", 4], ["hp", 4], ["nt", 2], ["dl", 1], ["pq", 1], ["qn", 1]] as const;

const MOBILE_PREFIXES = ["32", "33", "34", "35", "36", "37", "38", "39", "70", "76", "77", "78", "79", "81", "82", "83", "84", "85", "86", "88", "89", "96", "97", "98"];
let phoneSeq = 0;
/** Số di động Việt Nam không trùng lặp (phép nhân với số nguyên tố là song ánh trên 10^7). */
function nextMobile() {
  const i = ++phoneSeq;
  return `0${MOBILE_PREFIXES[i % MOBILE_PREFIXES.length]}${pad((i * 104729 + 1234567) % 10_000_000, 7)}`;
}

const img = (photoId: string, size = "w=800&q=80") => `https://images.unsplash.com/photo-${photoId}?${size}`;

// ───────────────────────────── Danh mục ─────────────────────────────

const C = ids.categories;
const NEW_CATEGORIES = {
  lauNuong: "40000000-0000-0000-0000-000000000012",
  doAnNhanh: "40000000-0000-0000-0000-000000000013",
  nhaHang: "40000000-0000-0000-0000-000000000014",
  banhNgot: "40000000-0000-0000-0000-000000000015",
  khuVuiChoi: "40000000-0000-0000-0000-000000000016",
  gymYoga: "40000000-0000-0000-0000-000000000017",
  lamDep: "40000000-0000-0000-0000-000000000018",
  salonToc: "40000000-0000-0000-0000-000000000019",
  nailMi: "40000000-0000-0000-0000-000000000020",
  tourThamQuan: "40000000-0000-0000-0000-000000000021",
  giaoDuc: "40000000-0000-0000-0000-000000000022",
  ngoaiNgu: "40000000-0000-0000-0000-000000000023",
  kyNang: "40000000-0000-0000-0000-000000000024"
} as const;

const categoryRows = [
  { id: NEW_CATEGORIES.lauNuong, parent_id: C.anUong, name: "Lẩu & Nướng", slug: "lau-nuong", description: "Voucher nhà hàng lẩu và đồ nướng", sort_order: 12 },
  { id: NEW_CATEGORIES.doAnNhanh, parent_id: C.anUong, name: "Đồ ăn nhanh", slug: "do-an-nhanh", description: "Voucher gà rán, burger, pizza", sort_order: 13 },
  { id: NEW_CATEGORIES.nhaHang, parent_id: C.anUong, name: "Nhà hàng", slug: "nha-hang", description: "Voucher nhà hàng Việt, Á, Âu", sort_order: 14 },
  { id: NEW_CATEGORIES.banhNgot, parent_id: C.anUong, name: "Bánh ngọt & Tráng miệng", slug: "banh-ngot-trang-mieng", description: "Voucher tiệm bánh và món tráng miệng", sort_order: 15 },
  { id: NEW_CATEGORIES.khuVuiChoi, parent_id: C.giaiTri, name: "Khu vui chơi", slug: "khu-vui-choi", description: "Voucher khu vui chơi, bowling, trò chơi trong nhà", sort_order: 16 },
  { id: NEW_CATEGORIES.gymYoga, parent_id: C.chamSocSucKhoe, name: "Gym & Yoga", slug: "gym-yoga", description: "Voucher phòng tập gym, yoga, pilates", sort_order: 17 },
  { id: NEW_CATEGORIES.lamDep, name: "Làm đẹp", slug: "lam-dep", description: "Voucher salon và dịch vụ làm đẹp", sort_order: 18 },
  { id: NEW_CATEGORIES.salonToc, parent_id: NEW_CATEGORIES.lamDep, name: "Salon tóc", slug: "salon-toc", description: "Voucher cắt, uốn, nhuộm tóc", sort_order: 19 },
  { id: NEW_CATEGORIES.nailMi, parent_id: NEW_CATEGORIES.lamDep, name: "Nail & Mi", slug: "nail-mi", description: "Voucher làm móng và nối mi", sort_order: 20 },
  { id: NEW_CATEGORIES.tourThamQuan, parent_id: C.duLichNghiDuong, name: "Tour & Vé tham quan", slug: "tour-ve-tham-quan", description: "Voucher tour du lịch và vé tham quan", sort_order: 21 },
  { id: NEW_CATEGORIES.giaoDuc, name: "Giáo dục", slug: "giao-duc", description: "Voucher khóa học và đào tạo", sort_order: 22 },
  { id: NEW_CATEGORIES.ngoaiNgu, parent_id: NEW_CATEGORIES.giaoDuc, name: "Khóa học ngoại ngữ", slug: "khoa-hoc-ngoai-ngu", description: "Voucher khóa học tiếng Anh, Nhật, Hàn", sort_order: 23 },
  { id: NEW_CATEGORIES.kyNang, parent_id: NEW_CATEGORIES.giaoDuc, name: "Khóa học kỹ năng", slug: "khoa-hoc-ky-nang", description: "Voucher workshop và khóa học kỹ năng", sort_order: 24 }
];

type Group = "drink" | "food" | "fun" | "wellness" | "beauty" | "travel" | "edu";

type Template = {
  title: string;
  variants: ReadonlyArray<readonly [string, number]>;
  discount: readonly [number, number];
  validity: readonly [number, number];
  description: string;
};

type CategorySpec = {
  id: string;
  group: Group;
  images: string[];
  templates: Template[];
  terms: string[];
  usage: string[];
};

const FOOD_TERMS = ["Không áp dụng ngày lễ, Tết", "Không cộng dồn với chương trình khuyến mãi khác", "Không quy đổi thành tiền mặt", "Giá đã bao gồm VAT", "Áp dụng tại chi nhánh được liệt kê"];
const FOOD_USAGE = ["Xuất trình mã QR cho thu ngân trước khi thanh toán", "Nhân viên quét mã để xác nhận sử dụng", "Mỗi mã chỉ sử dụng một lần"];
const BOOKING_USAGE = ["Đặt lịch trước qua hotline của chi nhánh", "Xuất trình mã QR khi đến nơi", "Nhân viên quét mã để xác nhận sử dụng"];

const CATEGORY_SPECS: Record<string, CategorySpec> = {
  caPhe: {
    id: C.caPhe, group: "drink",
    images: ["1509042239860-f550ce710b93", "1495474472287-4d71bcdd2085", "1461023058943-07fcbe16d735", "1447933601403-0c6688de566e"],
    templates: [
      { title: "Mua 1 tặng 1 {v} size M", variants: [["Cà phê sữa đá", 58000], ["Bạc xỉu", 59000], ["Cold Brew cam sả", 69000], ["Cà phê muối", 62000], ["Latte hạnh nhân", 75000]], discount: [40, 48], validity: [14, 30], description: "Mua 1 ly {v} size M, tặng thêm 1 ly cùng loại." },
      { title: "Combo 2 {v} + 1 bánh croissant", variants: [["Americano", 135000], ["Cappuccino", 155000], ["Cà phê sữa", 125000]], discount: [22, 32], validity: [14, 30], description: "Combo gồm 2 ly {v} và 1 bánh croissant bơ." },
      { title: "Thẻ 10 ly {v}", variants: [["cà phê phin", 450000], ["Cold Brew", 590000], ["Latte", 650000]], discount: [15, 25], validity: [60, 90], description: "Thẻ trả trước 10 ly {v}, sử dụng nhiều lần trong thời hạn." },
      { title: "Voucher mệnh giá {v}", variants: [["100.000đ", 100000], ["200.000đ", 200000], ["300.000đ", 300000]], discount: [10, 18], validity: [30, 60], description: "Phiếu quà tặng mệnh giá {v}, áp dụng toàn bộ thực đơn." }
    ],
    terms: [...FOOD_TERMS, "Không áp dụng cho đơn giao hàng"], usage: FOOD_USAGE
  },
  traSua: {
    id: C.traSua, group: "drink",
    images: ["1558857563-b371033873b8", "1525385133512-2f3bdd039054"],
    templates: [
      { title: "{v} size L giảm sâu", variants: [["Trà sữa trân châu đường đen", 59000], ["Trà sữa ô long", 55000], ["Trà đào cam sả", 52000], ["Matcha latte kem cheese", 65000]], discount: [28, 40], validity: [14, 30], description: "1 ly {v} size L, đầy đủ topping mặc định." },
      { title: "Combo 2 ly {v}", variants: [["trà sữa truyền thống", 110000], ["trà trái cây nhiệt đới", 118000], ["sữa tươi trân châu", 120000]], discount: [25, 35], validity: [14, 30], description: "Combo 2 ly {v} size M, tự chọn mức đường và đá." },
      { title: "Combo nhóm 4 ly {v}", variants: [["trà sữa tự chọn", 236000], ["trà trái cây", 220000]], discount: [25, 33], validity: [14, 30], description: "Combo 4 ly {v} cho nhóm bạn, tự chọn hương vị." }
    ],
    terms: [...FOOD_TERMS, "Topping thêm tính phí theo giá niêm yết"], usage: FOOD_USAGE
  },
  buffet: {
    id: C.buffet, group: "food",
    images: ["1555939594-58d7cb561ad1", "1544025162-d76694265947", "1414235077428-338989a2e8c0"],
    templates: [
      { title: "Buffet {v} cho 1 người", variants: [["trưa ngày thường", 299000], ["tối ngày thường", 399000], ["cuối tuần", 459000], ["hải sản cao cấp", 699000]], discount: [18, 30], validity: [20, 45], description: "Vé buffet {v} không giới hạn món, chưa bao gồm đồ uống." },
      { title: "Buffet {v} cho 2 người", variants: [["nướng lẩu", 798000], ["hải sản", 1298000]], discount: [20, 30], validity: [20, 45], description: "Combo buffet {v} dành cho 2 khách, thời gian dùng bữa 90 phút." },
      { title: "Buffet gia đình 4 người - {v}", variants: [["ngày thường", 1499000], ["cuối tuần", 1699000]], discount: [20, 28], validity: [20, 45], description: "Buffet cho gia đình 4 người ({v}), miễn phí trẻ em dưới 1m." }
    ],
    terms: [...FOOD_TERMS, "Thời gian dùng bữa tối đa 90 phút", "Phụ thu món thừa theo quy định nhà hàng"], usage: BOOKING_USAGE
  },
  lauNuong: {
    id: NEW_CATEGORIES.lauNuong, group: "food",
    images: ["1569050467447-ce54b3bbc37d", "1529692236671-f1f6cf9683ba", "1544025162-d76694265947"],
    templates: [
      { title: "Set {v} cho 2 người", variants: [["lẩu Thái hải sản", 459000], ["lẩu nấm thiên nhiên", 429000], ["nướng ba chỉ bò Mỹ", 520000], ["lẩu bò nhúng giấm", 480000]], discount: [20, 32], validity: [20, 30], description: "Set {v} cho 2 người, kèm rau và đồ nhúng." },
      { title: "Set {v} cho nhóm 4 người", variants: [["lẩu nướng combo", 899000], ["nướng thập cẩm", 960000], ["lẩu gà lá é", 780000]], discount: [20, 30], validity: [20, 30], description: "Set {v} đầy đủ cho 4 người, tặng kèm nước sâm." },
      { title: "Voucher mệnh giá {v}", variants: [["300.000đ", 300000], ["500.000đ", 500000]], discount: [12, 20], validity: [30, 60], description: "Phiếu quà tặng {v}, áp dụng cho toàn bộ thực đơn." }
    ],
    terms: [...FOOD_TERMS, "Áp dụng cho bàn tối đa theo số người của set"], usage: BOOKING_USAGE
  },
  doAnNhanh: {
    id: NEW_CATEGORIES.doAnNhanh, group: "food",
    images: ["1568901346375-23c9450c58cd", "1513104890138-7c749659a591", "1626645738196-c2a7c87a8f58"],
    templates: [
      { title: "Combo {v}", variants: [["2 miếng gà giòn + khoai + nước", 99000], ["burger bò phô mai + khoai + nước", 109000], ["pizza cỡ vừa + 2 nước", 189000]], discount: [25, 38], validity: [14, 30], description: "Combo {v}, dùng tại cửa hàng hoặc mang đi." },
      { title: "Combo gia đình {v}", variants: [["8 miếng gà + 2 khoai lớn + 4 nước", 399000], ["2 pizza cỡ lớn + mì Ý + 4 nước", 559000], ["4 burger + 2 khoai + 4 nước", 429000]], discount: [22, 32], validity: [14, 30], description: "Combo gia đình gồm {v}." },
      { title: "Giảm 50% {v}", variants: [["pizza cỡ lớn", 289000], ["xô gà 6 miếng", 239000]], discount: [48, 50], validity: [7, 14], description: "Giảm trực tiếp 50% cho {v}." }
    ],
    terms: [...FOOD_TERMS, "Không áp dụng cho đơn giao hàng qua ứng dụng bên thứ ba"], usage: FOOD_USAGE
  },
  nhaHang: {
    id: NEW_CATEGORIES.nhaHang, group: "food",
    images: ["1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0", "1555939594-58d7cb561ad1"],
    templates: [
      { title: "Set {v} cho 2 người", variants: [["cơm trưa văn phòng", 260000], ["món Việt truyền thống", 520000], ["sushi - sashimi", 690000], ["bít tết Úc", 890000]], discount: [18, 30], validity: [20, 45], description: "Set {v} dành cho 2 người, gồm khai vị, món chính và tráng miệng." },
      { title: "Set tiệc {v}", variants: [["gia đình 4 người", 1290000], ["sinh nhật 6 người", 1890000], ["công ty 10 người", 2990000]], discount: [15, 25], validity: [30, 60], description: "Set tiệc {v} với thực đơn được nhà hàng thiết kế sẵn." },
      { title: "Voucher mệnh giá {v}", variants: [["500.000đ", 500000], ["1.000.000đ", 1000000]], discount: [10, 18], validity: [45, 90], description: "Phiếu quà tặng {v} áp dụng toàn bộ thực đơn." }
    ],
    terms: [...FOOD_TERMS, "Vui lòng đặt bàn trước tối thiểu 2 giờ"], usage: BOOKING_USAGE
  },
  banhNgot: {
    id: NEW_CATEGORIES.banhNgot, group: "food",
    images: ["1578985545062-69928b1d9587", "1486427944299-d1955d23e34d"],
    templates: [
      { title: "Bánh kem {v}", variants: [["sinh nhật size 16cm", 320000], ["sinh nhật size 20cm", 450000], ["mousse chanh dây", 380000], ["tiramisu", 420000]], discount: [15, 25], validity: [14, 30], description: "Bánh {v}, đặt trước 24 giờ, viết chữ theo yêu cầu." },
      { title: "Combo {v}", variants: [["6 bánh ngọt tự chọn", 210000], ["trà chiều cho 2 người", 260000], ["hộp quà 12 bánh macaron", 360000]], discount: [20, 30], validity: [14, 30], description: "Combo {v} tại tiệm." }
    ],
    terms: [...FOOD_TERMS, "Bánh kem cần đặt trước tối thiểu 24 giờ"], usage: FOOD_USAGE
  },
  veXemPhim: {
    id: C.veXemPhim, group: "fun",
    images: ["1489599849927-2ee91cede3ba", "1536440136628-849c177e76a1"],
    templates: [
      { title: "Vé xem phim {v}", variants: [["2D ngày thường", 95000], ["2D cuối tuần", 115000], ["3D", 140000], ["ghế đôi Sweetbox", 260000]], discount: [20, 35], validity: [30, 60], description: "1 vé xem phim {v}, áp dụng tất cả suất chiếu trước 22:00." },
      { title: "Combo {v}", variants: [["2 vé 2D + 1 bắp + 2 nước", 330000], ["1 vé + 1 bắp ngọt + 1 nước", 175000], ["4 vé 2D gia đình + 2 bắp", 560000]], discount: [25, 35], validity: [30, 60], description: "Combo {v}, đổi vé tại quầy hoặc trên ứng dụng của rạp." },
      { title: "Vé {v}", variants: [["IMAX", 220000], ["4DX", 250000]], discount: [15, 22], validity: [21, 45], description: "1 vé suất chiếu {v} tại rạp có phòng chiếu tương ứng." }
    ],
    terms: ["Không áp dụng suất chiếu đặc biệt và suất chiếu sớm", "Không áp dụng ngày lễ, Tết", "Vé đã đổi không hoàn hủy"], usage: ["Xuất trình mã QR tại quầy vé", "Nhân viên quét mã và in vé theo suất chiếu đã chọn"]
  },
  karaoke: {
    id: C.karaoke, group: "fun",
    images: ["1516280440614-37939bbacd81"],
    templates: [
      { title: "{v} hát karaoke", variants: [["2 giờ phòng thường", 360000], ["3 giờ phòng VIP", 750000], ["2 giờ phòng VIP + đĩa trái cây", 690000]], discount: [25, 40], validity: [20, 45], description: "{v}, sức chứa tối đa 10 khách." },
      { title: "Combo {v}", variants: [["sinh nhật 3 giờ + bánh kem", 990000], ["nhóm bạn 3 giờ + 12 nước", 890000]], discount: [25, 35], validity: [20, 45], description: "Combo {v} tại phòng hát tiêu chuẩn." }
    ],
    terms: ["Áp dụng khung giờ 10:00 - 18:00 các ngày trong tuần", "Phụ thu 20% sau 18:00 và cuối tuần", "Không áp dụng ngày lễ"], usage: BOOKING_USAGE
  },
  khuVuiChoi: {
    id: NEW_CATEGORIES.khuVuiChoi, group: "fun",
    images: ["1513889961551-628c1e5e2ee9", "1560713781-d00f6c18f388"],
    templates: [
      { title: "Vé {v}", variants: [["vui chơi trẻ em không giới hạn giờ", 180000], ["combo 1 bé + 1 phụ huynh", 220000], ["chơi bowling 2 game", 160000], ["thẻ game 300.000đ", 300000]], discount: [20, 35], validity: [30, 60], description: "Vé {v}, áp dụng tất cả các ngày trong tuần." },
      { title: "Gói sinh nhật {v}", variants: [["10 bé", 2500000], ["20 bé", 4200000]], discount: [15, 25], validity: [30, 60], description: "Gói tổ chức sinh nhật {v}, gồm trang trí và tiệc nhẹ." }
    ],
    terms: ["Trẻ em dưới 12 tuổi cần có người lớn đi kèm", "Không áp dụng ngày lễ, Tết", "Tuân thủ nội quy an toàn của khu vui chơi"], usage: ["Xuất trình mã QR tại quầy vé", "Nhận vòng tay/thẻ chơi sau khi quét mã"]
  },
  spaMassage: {
    id: C.spaMassage, group: "wellness",
    images: ["1544161515-4ab6ce6db874", "1540555700478-4be289fbecef"],
    templates: [
      { title: "{v}", variants: [["Massage body thảo dược 60 phút", 450000], ["Massage đá nóng 90 phút", 690000], ["Gội đầu dưỡng sinh 45 phút", 180000], ["Massage chân bấm huyệt 60 phút", 320000]], discount: [25, 40], validity: [30, 60], description: "Liệu trình {v} tại phòng riêng, kèm trà gừng." },
      { title: "Gói {v}", variants: [["chăm sóc da mặt chuyên sâu 75 phút", 790000], ["thư giãn cặp đôi 90 phút", 1350000], ["5 buổi massage body", 1990000]], discount: [25, 35], validity: [45, 90], description: "Gói {v}, sản phẩm thiên nhiên an toàn cho da." }
    ],
    terms: ["Đặt lịch trước tối thiểu 24 giờ", "Không áp dụng cho phụ nữ mang thai", "Đến trễ quá 15 phút lịch hẹn có thể bị hủy"], usage: BOOKING_USAGE
  },
  gymYoga: {
    id: NEW_CATEGORIES.gymYoga, group: "wellness",
    images: ["1534438327276-14e5300c3a48", "1544367567-0f2fcb009e0b"],
    templates: [
      { title: "Thẻ tập {v}", variants: [["gym 1 tháng", 600000], ["gym 3 tháng", 1590000], ["yoga 12 buổi", 1200000], ["pilates 8 buổi", 1600000]], discount: [20, 35], validity: [30, 60], description: "Thẻ tập {v}, kích hoạt trong thời hạn sử dụng voucher." },
      { title: "Gói {v}", variants: [["8 buổi PT 1 kèm 1", 2800000], ["tập thử 7 ngày + InBody", 299000]], discount: [25, 40], validity: [30, 60], description: "Gói {v} với huấn luyện viên chứng chỉ quốc tế." }
    ],
    terms: ["Thẻ tập không chuyển nhượng sau khi kích hoạt", "Mang theo CCCD khi kích hoạt thẻ", "Tuân thủ nội quy phòng tập"], usage: ["Đến quầy lễ tân và xuất trình mã QR", "Nhân viên quét mã và kích hoạt thẻ tập"]
  },
  salonToc: {
    id: NEW_CATEGORIES.salonToc, group: "beauty",
    images: ["1560066984-138dadb4c035", "1521590832167-7bcbfaa6381f"],
    templates: [
      { title: "{v}", variants: [["Cắt gội tạo kiểu", 180000], ["Uốn tóc Hàn Quốc", 890000], ["Nhuộm tóc thời trang", 790000], ["Phục hồi tóc keratin", 990000]], discount: [25, 40], validity: [30, 60], description: "Dịch vụ {v} bởi stylist có kinh nghiệm, sản phẩm chính hãng." },
      { title: "Combo {v}", variants: [["cắt + uốn + hấp dầu", 1150000], ["cắt + nhuộm + gội dưỡng", 990000]], discount: [25, 35], validity: [30, 60], description: "Combo {v}, áp dụng tóc dài đến ngang vai." }
    ],
    terms: ["Phụ thu tóc dài quá vai theo bảng giá", "Đặt lịch trước để được phục vụ đúng giờ", "Không áp dụng ngày lễ, Tết"], usage: BOOKING_USAGE
  },
  nailMi: {
    id: NEW_CATEGORIES.nailMi, group: "beauty",
    images: ["1604654894610-df63bc536371"],
    templates: [
      { title: "{v}", variants: [["Sơn gel tay + chân", 280000], ["Đắp móng bột", 450000], ["Nối mi classic", 350000], ["Nối mi volume", 550000]], discount: [25, 40], validity: [30, 45], description: "Dịch vụ {v}, dụng cụ được tiệt trùng theo tiêu chuẩn." }
    ],
    terms: ["Phụ thu vẽ móng nghệ thuật theo mẫu", "Đặt lịch trước để được phục vụ đúng giờ"], usage: BOOKING_USAGE
  },
  khachSanResort: {
    id: C.khachSanResort, group: "travel",
    images: ["1566073771259-6a8506099945", "1571896349842-33c89424de2d", "1520250497591-112f2f40a3f4"],
    templates: [
      { title: "Nghỉ dưỡng {v}", variants: [["2N1Đ phòng Deluxe + ăn sáng", 2600000], ["3N2Đ phòng Deluxe + ăn sáng", 4900000], ["2N1Đ villa hướng biển", 5900000]], discount: [20, 32], validity: [90, 180], description: "Gói nghỉ dưỡng {v} cho 2 người lớn và 1 trẻ em dưới 6 tuổi." },
      { title: "{v}", variants: [["Staycation 1 đêm cuối tuần", 2200000], ["Buffet tối + hồ bơi vô cực", 890000]], discount: [20, 30], validity: [60, 120], description: "Trải nghiệm {v} dành cho 2 khách." }
    ],
    terms: ["Đặt phòng trước tối thiểu 7 ngày", "Phụ thu cuối tuần, lễ, Tết theo chính sách khách sạn", "Không hoàn hủy sau khi xác nhận đặt phòng"], usage: ["Liên hệ bộ phận đặt phòng và cung cấp mã voucher", "Xuất trình mã QR và CCCD khi nhận phòng"]
  },
  tourThamQuan: {
    id: NEW_CATEGORIES.tourThamQuan, group: "travel",
    images: ["1528127269322-539801943592"],
    templates: [
      { title: "Tour {v}", variants: [["du thuyền vịnh Hạ Long 1 ngày", 1250000], ["địa đạo Củ Chi nửa ngày", 650000], ["miền Tây sông nước 1 ngày", 890000], ["Hà Nội - Ninh Bình 1 ngày", 1150000]], discount: [15, 28], validity: [60, 120], description: "Tour {v}, bao gồm xe đưa đón, hướng dẫn viên và bữa trưa." },
      { title: "Vé {v}", variants: [["tham quan + buffet trưa", 790000], ["du thuyền ngắm hoàng hôn", 990000]], discount: [15, 25], validity: [45, 90], description: "Vé {v} cho 1 người lớn." }
    ],
    terms: ["Đặt chỗ trước tối thiểu 3 ngày", "Lịch trình có thể thay đổi theo thời tiết", "Trẻ em tính phí theo chính sách của đơn vị tổ chức"], usage: ["Liên hệ hotline để đặt chỗ và cung cấp mã voucher", "Xuất trình mã QR tại điểm đón"]
  },
  ngoaiNgu: {
    id: NEW_CATEGORIES.ngoaiNgu, group: "edu",
    images: ["1503676260728-1c00da094a0b", "1522202176988-66273c2fd55f"],
    templates: [
      { title: "Khóa học {v}", variants: [["tiếng Anh giao tiếp 24 buổi", 4500000], ["luyện thi IELTS 6.5+ 36 buổi", 8900000], ["tiếng Nhật N5 30 buổi", 4200000], ["tiếng Hàn sơ cấp 24 buổi", 3900000]], discount: [15, 30], validity: [90, 180], description: "Khóa học {v}, lớp tối đa 12 học viên, giáo trình được cung cấp." },
      { title: "{v}", variants: [["Kiểm tra trình độ + 2 buổi học thử", 300000], ["Khóa tiếng Anh thiếu nhi 1 tháng", 1800000]], discount: [20, 40], validity: [60, 120], description: "{v} tại trung tâm." }
    ],
    terms: ["Voucher không chuyển nhượng sau khi kích hoạt khóa học", "Lịch khai giảng theo thông báo của trung tâm"], usage: ["Liên hệ trung tâm để xếp lớp", "Xuất trình mã QR khi làm thủ tục nhập học"]
  },
  kyNang: {
    id: NEW_CATEGORIES.kyNang, group: "edu",
    images: ["1522202176988-66273c2fd55f", "1503676260728-1c00da094a0b"],
    templates: [
      { title: "Workshop {v}", variants: [["làm nến thơm", 350000], ["vẽ tranh acrylic", 420000], ["pha chế cà phê cơ bản", 590000], ["làm bánh mì Việt Nam", 650000]], discount: [15, 30], validity: [30, 60], description: "Workshop {v} 3 giờ, đã bao gồm nguyên liệu và dụng cụ." },
      { title: "Khóa học {v}", variants: [["thuyết trình tự tin 8 buổi", 2500000], ["Excel cho người đi làm 10 buổi", 1900000], ["nấu ăn gia đình 6 buổi", 2200000]], discount: [15, 30], validity: [60, 120], description: "Khóa học {v} với giảng viên giàu kinh nghiệm." }
    ],
    terms: ["Đăng ký lịch học trước tối thiểu 3 ngày", "Voucher không chuyển nhượng sau khi đăng ký lớp"], usage: ["Liên hệ đơn vị tổ chức để đăng ký lịch", "Xuất trình mã QR khi đến lớp"]
  }
};

const USAGE_RATE: Record<Group, number> = { drink: 0.84, food: 0.8, fun: 0.76, wellness: 0.72, beauty: 0.74, travel: 0.66, edu: 0.82 };

const CAMPAIGNS = ["Tết", "Valentine", "Mừng 8/3", "Lễ 30/4 - 1/5", "Chào Hè", "Hè Rực Rỡ", "Ưu đãi tháng 7", "Back to School", "Trung Thu", "Mừng 20/10", "Black Friday", "Giáng Sinh"];
/** Hệ số nhu cầu theo ngày (mùa mua sắm, ngày đôi, cuối tuần). */
function demandMultiplier(day: number) {
  const d = dateOf(day);
  const month = d.getUTCMonth() + 1;
  const date = d.getUTCDate();
  const weekday = d.getUTCDay();
  let m = weekday === 0 || weekday === 6 ? 1.3 : weekday === 5 ? 1.12 : 1;
  if (month === date) m *= 1.9; // 9/9, 10/10, 11/11, 12/12
  if (month === 2 && date === 14) m *= 1.6;
  if ((month === 3 && date === 8) || (month === 10 && date === 20)) m *= 1.5;
  if (month === 11 && date >= 24 && date <= 30) m *= 1.4;
  if (month === 12 && date >= 20) m *= 1.25;
  if (month === 1 && date >= 15) m *= 1.3;
  return m;
}

// ───────────────────────────── Đối tác ─────────────────────────────

type PartnerSpec = {
  name: string;
  code: string;
  type: "restaurant" | "spa" | "entertainment" | "hotel" | "other";
  categories: Array<keyof typeof CATEGORY_SPECS>;
  branches: Array<[CityKey, number]>;
  products: number;
  description: string;
  website: string;
  approval?: "pending" | "rejected";
  suspended?: boolean;
};

const PARTNERS: PartnerSpec[] = [
  { name: "Mộc Cà Phê", code: "MOCCAPHE", type: "restaurant", categories: ["caPhe"], branches: [["hcm", 3]], products: 30, description: "Chuỗi cà phê phin truyền thống với không gian gỗ mộc.", website: "https://moccaphe.vn" },
  { name: "Sài Gòn Roastery", code: "SGROASTERY", type: "restaurant", categories: ["caPhe", "banhNgot"], branches: [["hcm", 2], ["hn", 1]], products: 28, description: "Xưởng rang cà phê đặc sản và quán cà phê specialty.", website: "https://saigonroastery.vn" },
  { name: "Hạt Nâu Coffee", code: "HATNAU", type: "restaurant", categories: ["caPhe"], branches: [["hn", 3]], products: 26, description: "Cà phê Robusta Tây Nguyên rang mộc, phục vụ tại Hà Nội.", website: "https://hatnau.vn" },
  { name: "Cà Phê Phố Cổ 1946", code: "PHOCO1946", type: "restaurant", categories: ["caPhe"], branches: [["hn", 2]], products: 22, description: "Cà phê trứng và cà phê muối giữa lòng phố cổ.", website: "https://phoco1946.vn" },
  { name: "Trà Sữa Mây", code: "TRASUAMAY", type: "restaurant", categories: ["traSua"], branches: [["hcm", 3]], products: 30, description: "Trà sữa nấu từ lá trà nguyên chất, trân châu làm mới mỗi ngày.", website: "https://trasuamay.vn" },
  { name: "Bobo Tea House", code: "BOBOTEA", type: "restaurant", categories: ["traSua"], branches: [["hcm", 2], ["hn", 2]], products: 30, description: "Trà sữa và trà trái cây phong cách Đài Loan.", website: "https://bobotea.vn" },
  { name: "Lá Trà Xanh", code: "LATRAXANH", type: "restaurant", categories: ["traSua", "caPhe"], branches: [["dn", 2], ["hcm", 1]], products: 24, description: "Trà trái cây nhiệt đới và cà phê, xuất phát từ Đà Nẵng.", website: "https://latraxanh.vn" },
  { name: "Sumo Grill Buffet", code: "SUMOGRILL", type: "restaurant", categories: ["buffet", "lauNuong"], branches: [["hcm", 2], ["hn", 1]], products: 30, description: "Buffet nướng lẩu phong cách Nhật Bản.", website: "https://sumogrill.vn" },
  { name: "Biển Xanh Seafood Buffet", code: "BIENXANH", type: "restaurant", categories: ["buffet"], branches: [["dn", 1], ["nt", 1]], products: 22, description: "Buffet hải sản tươi sống ven biển miền Trung.", website: "https://bienxanhseafood.vn" },
  { name: "Lẩu Nấm Thiên Nhiên", code: "LAUNAM", type: "restaurant", categories: ["lauNuong"], branches: [["hcm", 2], ["hn", 1]], products: 26, description: "Lẩu nấm thiên nhiên với nước dùng hầm 12 tiếng.", website: "https://launamthiennhien.vn" },
  { name: "Nướng Ngói Hà Thành", code: "NUONGNGOI", type: "restaurant", categories: ["lauNuong"], branches: [["hn", 3]], products: 26, description: "Đồ nướng trên ngói kiểu Hà Nội xưa.", website: "https://nuongngoi.vn" },
  { name: "Seoul BBQ House", code: "SEOULBBQ", type: "restaurant", categories: ["lauNuong", "buffet"], branches: [["hcm", 2], ["dn", 1]], products: 28, description: "Thịt nướng Hàn Quốc và buffet panchan không giới hạn.", website: "https://seoulbbq.vn" },
  { name: "Gà Rán Vàng Ruộm", code: "GARANVANG", type: "restaurant", categories: ["doAnNhanh"], branches: [["hcm", 3], ["hn", 2]], products: 32, description: "Gà rán giòn tẩm bột công thức riêng.", website: "https://garanvangruom.vn" },
  { name: "Burger Nhà Làm", code: "BURGERNL", type: "restaurant", categories: ["doAnNhanh"], branches: [["hcm", 2]], products: 22, description: "Burger bò xay tại chỗ, bánh nướng mỗi sáng.", website: "https://burgernhalam.vn" },
  { name: "Pizza Lò Củi Napoli", code: "NAPOLI", type: "restaurant", categories: ["doAnNhanh", "nhaHang"], branches: [["hcm", 1], ["hn", 1]], products: 24, description: "Pizza nướng lò củi chuẩn vị Napoli.", website: "https://pizzanapoli.vn" },
  { name: "Bếp Việt Xưa", code: "BEPVIETXUA", type: "restaurant", categories: ["nhaHang"], branches: [["hn", 2], ["hcm", 1]], products: 24, description: "Món Việt ba miền trong không gian nhà cổ.", website: "https://bepvietxua.vn" },
  { name: "Sakura Japanese Dining", code: "SAKURA", type: "restaurant", categories: ["nhaHang"], branches: [["hcm", 2]], products: 22, description: "Nhà hàng Nhật với sushi, sashimi và set kaiseki.", website: "https://sakuradining.vn" },
  { name: "Nhà Hàng Sông Hàn", code: "SONGHAN", type: "restaurant", categories: ["nhaHang"], branches: [["dn", 1]], products: 18, description: "Hải sản và đặc sản miền Trung bên bờ sông Hàn.", website: "https://nhahangsonghan.vn" },
  { name: "Tiệm Bánh Bơ Sữa", code: "BOSUA", type: "restaurant", categories: ["banhNgot"], branches: [["hcm", 3]], products: 26, description: "Bánh kem bơ sữa và bánh ngọt kiểu Pháp.", website: "https://banhbosua.vn" },
  { name: "Paris Gâteaux", code: "PARISGATEAUX", type: "restaurant", categories: ["banhNgot", "caPhe"], branches: [["hn", 2]], products: 22, description: "Tiệm bánh Pháp với macaron và entremet.", website: "https://parisgateaux.vn" },
  { name: "Starlight Cinemas", code: "STARLIGHT", type: "entertainment", categories: ["veXemPhim"], branches: [["hcm", 2], ["hn", 1], ["dn", 1]], products: 34, description: "Cụm rạp chiếu phim với phòng chiếu IMAX và 4DX.", website: "https://starlightcinemas.vn" },
  { name: "Lumière Cineplex", code: "LUMIERE", type: "entertainment", categories: ["veXemPhim"], branches: [["hn", 2], ["hp", 1]], products: 28, description: "Rạp chiếu phim giá tốt cho sinh viên và gia đình.", website: "https://lumierecineplex.vn" },
  { name: "Karaoke Nốt Nhạc Vàng", code: "NOTNHACVANG", type: "entertainment", categories: ["karaoke"], branches: [["hcm", 3]], products: 24, description: "Karaoke phòng cách âm chuẩn, dàn âm thanh Hàn Quốc.", website: "https://notnhacvang.vn" },
  { name: "Melody Box Karaoke", code: "MELODYBOX", type: "entertainment", categories: ["karaoke"], branches: [["hn", 2], ["dn", 1]], products: 22, description: "Karaoke box hiện đại dành cho nhóm bạn trẻ.", website: "https://melodybox.vn" },
  { name: "Kizz Land", code: "KIZZLAND", type: "entertainment", categories: ["khuVuiChoi"], branches: [["hcm", 2], ["hn", 1]], products: 22, description: "Khu vui chơi trong nhà cho trẻ em 2-12 tuổi.", website: "https://kizzland.vn" },
  { name: "Strike Zone Bowling", code: "STRIKEZONE", type: "entertainment", categories: ["khuVuiChoi"], branches: [["hcm", 1], ["hn", 1]], products: 16, description: "Trung tâm bowling và game giải trí.", website: "https://strikezone.vn", suspended: true },
  { name: "Hương Sen Spa", code: "HUONGSEN", type: "spa", categories: ["spaMassage"], branches: [["hcm", 2], ["hn", 1]], products: 26, description: "Spa trị liệu thảo dược Việt Nam.", website: "https://huongsenspa.vn" },
  { name: "Lotus Wellness Spa", code: "LOTUSWELL", type: "spa", categories: ["spaMassage"], branches: [["dn", 1], ["nt", 1]], products: 20, description: "Spa nghỉ dưỡng ven biển với liệu trình đá nóng.", website: "https://lotuswellness.vn" },
  { name: "Mây Spa & Massage", code: "MAYSPA", type: "spa", categories: ["spaMassage"], branches: [["hn", 2]], products: 20, description: "Massage bấm huyệt và gội đầu dưỡng sinh.", website: "https://mayspa.vn" },
  { name: "FitZone Gym", code: "FITZONE", type: "other", categories: ["gymYoga"], branches: [["hcm", 3], ["hn", 1]], products: 24, description: "Chuỗi phòng tập gym 24/7 với huấn luyện viên cá nhân.", website: "https://fitzone.vn" },
  { name: "An Yoga Studio", code: "ANYOGA", type: "other", categories: ["gymYoga"], branches: [["hn", 2]], products: 18, description: "Studio yoga và pilates lớp nhỏ.", website: "https://anyoga.vn" },
  { name: "Tóc Đẹp Studio", code: "TOCDEP", type: "spa", categories: ["salonToc"], branches: [["hcm", 2]], products: 20, description: "Salon tóc phong cách Hàn Quốc.", website: "https://tocdepstudio.vn" },
  { name: "Bella Hair Salon", code: "BELLAHAIR", type: "spa", categories: ["salonToc"], branches: [["hn", 2]], products: 18, description: "Salon tóc nữ với stylist đào tạo tại Seoul.", website: "https://bellahair.vn" },
  { name: "Hồng Nail & Mi", code: "HONGNAIL", type: "spa", categories: ["nailMi"], branches: [["hcm", 2], ["hn", 1]], products: 20, description: "Tiệm nail và nối mi với dụng cụ tiệt trùng.", website: "https://hongnail.vn" },
  { name: "Hải Âu Beach Resort", code: "HAIAU", type: "hotel", categories: ["khachSanResort"], branches: [["nt", 1]], products: 16, description: "Resort 4 sao sát biển Nha Trang.", website: "https://haiauresort.vn" },
  { name: "Đồi Thông Đà Lạt Hotel", code: "DOITHONG", type: "hotel", categories: ["khachSanResort"], branches: [["dl", 1]], products: 14, description: "Khách sạn boutique giữa đồi thông Đà Lạt.", website: "https://doithonghotel.vn" },
  { name: "Ngọc Trai Resort Phú Quốc", code: "NGOCTRAI", type: "hotel", categories: ["khachSanResort", "spaMassage"], branches: [["pq", 1]], products: 18, description: "Resort nghỉ dưỡng và spa tại bãi Dài Phú Quốc.", website: "https://ngoctrairesort.vn" },
  { name: "Sông Hàn Riverside Hotel", code: "SHRIVERSIDE", type: "hotel", categories: ["khachSanResort"], branches: [["dn", 1]], products: 14, description: "Khách sạn ven sông Hàn, gần cầu Rồng.", website: "https://songhanriverside.vn" },
  { name: "Việt Lữ Travel", code: "VIETLU", type: "other", categories: ["tourThamQuan"], branches: [["hcm", 1], ["hn", 1]], products: 20, description: "Công ty lữ hành tour trong ngày và tham quan.", website: "https://vietlutravel.vn" },
  { name: "Vịnh Xanh Cruise", code: "VINHXANH", type: "other", categories: ["tourThamQuan"], branches: [["qn", 1]], products: 14, description: "Du thuyền tham quan vịnh Hạ Long.", website: "https://vinhxanhcruise.vn" },
  { name: "Sunrise English Center", code: "SUNRISE", type: "other", categories: ["ngoaiNgu"], branches: [["hcm", 2], ["hn", 1]], products: 20, description: "Trung tâm tiếng Anh giao tiếp và luyện thi IELTS.", website: "https://sunriseenglish.vn" },
  { name: "Nihongo Dojo", code: "NIHONGO", type: "other", categories: ["ngoaiNgu"], branches: [["hn", 1], ["hcm", 1]], products: 14, description: "Trung tâm tiếng Nhật và tiếng Hàn.", website: "https://nihongodojo.vn" },
  { name: "Học Viện Kỹ Năng Mới", code: "KYNANGMOI", type: "other", categories: ["kyNang"], branches: [["hcm", 1], ["hn", 1]], products: 18, description: "Khóa học kỹ năng mềm và tin học văn phòng.", website: "https://kynangmoi.vn" },
  { name: "Bếp Nhà Cooking Class", code: "BEPNHA", type: "other", categories: ["kyNang"], branches: [["hcm", 1]], products: 14, description: "Lớp học nấu ăn và làm bánh cho người mới bắt đầu.", website: "https://bepnhacooking.vn" },
  // Đối tác mới đăng ký / bị từ chối: chưa có voucher nào được bán.
  { name: "Bánh Mì Cô Ba", code: "BANHMICOBA", type: "restaurant", categories: ["doAnNhanh"], branches: [["hcm", 1]], products: 0, description: "Bánh mì Sài Gòn truyền thống.", website: "https://banhmicoba.vn", approval: "pending" },
  { name: "Zen Yoga Đà Nẵng", code: "ZENYOGADN", type: "other", categories: ["gymYoga"], branches: [["dn", 1]], products: 0, description: "Studio yoga ven biển Mỹ Khê.", website: "https://zenyogadn.vn", approval: "pending" },
  { name: "Quán Nhậu Vui Vẻ", code: "NHAUVUIVE", type: "restaurant", categories: ["nhaHang"], branches: [["hcm", 1]], products: 0, description: "Quán nhậu bình dân.", website: "https://nhauvuive.vn", approval: "rejected" }
];

const REJECT_REASONS = [
  "Hình ảnh voucher không rõ ràng, vui lòng cập nhật ảnh thực tế",
  "Điều kiện sử dụng chưa đầy đủ",
  "Giá gốc không khớp với bảng giá niêm yết của cửa hàng",
  "Mô tả chưa đúng với dịch vụ thực tế",
  "Thời gian sử dụng quá ngắn so với thời gian bán"
];

const REVIEW_COMMENTS: Record<Group, { good: string[]; ok: string[]; bad: string[] }> = {
  drink: {
    good: ["Đồ uống ngon, nhân viên quét mã rất nhanh.", "Mua voucher rẻ hơn mua trực tiếp khá nhiều, sẽ ủng hộ tiếp.", "Quán đẹp, đồ uống đậm vị, đổi mã không phải chờ.", "Vị ngon như mua giá gốc, rất đáng tiền."],
    ok: ["Đồ uống ổn, giờ cao điểm hơi đông phải chờ lâu.", "Vị bình thường nhưng giá voucher hợp lý."],
    bad: ["Ly nhận được nhỏ hơn mô tả.", "Nhân viên lúng túng khi quét mã, mất gần 15 phút."]
  },
  food: {
    good: ["Món ăn ngon, phục vụ nhiệt tình, voucher dùng rất tiện.", "Phần ăn đầy đặn, đúng như mô tả. Sẽ quay lại.", "Đặt bàn qua hotline nhanh, nhân viên xác nhận voucher ngay.", "Giá voucher rất hời so với gọi lẻ."],
    ok: ["Đồ ăn ổn, cuối tuần đông nên phục vụ hơi chậm.", "Món ăn được, không gian hơi ồn."],
    bad: ["Phải chờ khá lâu dù đã đặt bàn trước.", "Một số món trong set bị thay bằng món khác."]
  },
  fun: {
    good: ["Đổi vé nhanh, chỗ ngồi đẹp. Rất hài lòng.", "Cả nhà chơi vui, voucher tiết kiệm được kha khá.", "Phòng sạch, âm thanh tốt, nhân viên thân thiện."],
    ok: ["Trải nghiệm ổn, cuối tuần hơi đông.", "Giá tốt nhưng ít khung giờ trống."],
    bad: ["Phòng được xếp không đúng loại trong voucher.", "Phải xếp hàng lâu ở quầy để đổi mã."]
  },
  wellness: {
    good: ["Kỹ thuật viên tay nghề tốt, không gian thư giãn.", "Liệu trình đúng thời gian, rất đáng tiền.", "Đặt lịch dễ, phục vụ chu đáo."],
    ok: ["Dịch vụ ổn, phòng hơi nhỏ.", "Chất lượng tạm được so với giá voucher."],
    bad: ["Bị dời lịch hẹn hai lần.", "Thời gian thực tế ngắn hơn mô tả."]
  },
  beauty: {
    good: ["Stylist tư vấn kỹ, kiểu tóc rất hợp.", "Làm kỹ, đẹp, giá voucher rẻ hơn hẳn.", "Tiệm sạch sẽ, dụng cụ được tiệt trùng."],
    ok: ["Kết quả ổn, chờ hơi lâu.", "Dịch vụ được, phụ thu hơi nhiều."],
    bad: ["Màu nhuộm không giống mẫu đã chọn.", "Bị phụ thu thêm khá nhiều so với dự kiến."]
  },
  travel: {
    good: ["Phòng sạch, view đẹp, nhận phòng nhanh với mã voucher.", "Tour tổ chức chuyên nghiệp, hướng dẫn viên nhiệt tình.", "Gói nghỉ dưỡng rất đáng tiền, ăn sáng ngon."],
    ok: ["Kỳ nghỉ ổn, phụ thu cuối tuần hơi cao.", "Dịch vụ tốt nhưng phải đặt sớm mới còn phòng."],
    bad: ["Phòng được xếp không đúng hạng trong voucher.", "Lịch trình tour bị rút ngắn."]
  },
  edu: {
    good: ["Giảng viên nhiệt tình, lớp nhỏ nên được hỗ trợ nhiều.", "Nội dung thực tế, voucher giúp tiết kiệm học phí.", "Workshop vui, nguyên liệu đầy đủ."],
    ok: ["Khóa học ổn, lịch học hơi ít lựa chọn.", "Nội dung được, phòng học hơi chật."],
    bad: ["Lịch khai giảng bị lùi nhiều lần.", "Giáo trình không giống như giới thiệu."]
  }
};

// ───────────────────────────── Kiểu dữ liệu mô phỏng ─────────────────────────────

type BulkUser = Prisma.UserCreateManyInput & { id: string; created_at: Date };
type BranchSim = { id: string; partnerIndex: number; city: CityKey; createdDay: number; staff: string[] };
type PartnerSim = {
  spec: PartnerSpec;
  id: string;
  ownerId: string;
  voucherStaffId: string | null;
  approvedDay: number | null;
  createdDay: number;
  suspendDay: number | null;
  branches: BranchSim[];
};
type ProductSim = {
  row: Prisma.VoucherProductCreateManyInput & { id: string; name: string; total_quantity: number; validity_days: number };
  partner: PartnerSim;
  spec: CategorySpec;
  branches: BranchSim[];
  cities: CityKey[];
  sellFrom: number;
  sellTo: number;
  price: number;
  originalPrice: number;
  discountRate: number;
  weight: number;
  remaining: number;
  approved: boolean;
  pausedDay: number | null;
};

// ───────────────────────────── Seed chính ─────────────────────────────

export async function seedBulk({ prisma, passwordHash }: SeedContext) {
  console.log(`Bulk seed: mô phỏng ${HISTORY_DAYS} ngày đến ${dateOf(TODAY).toISOString().slice(0, 10)}...`);

  const users: BulkUser[] = [];
  const makeUser = (role: string, createdAt: Date, extra: Partial<BulkUser> & { email: string }): BulkUser => {
    const gender = chance(0.55) ? "female" : "male";
    const family = weighted(FAMILY_NAMES);
    const fullName = gender === "female"
      ? `${family} ${pick(FEMALE_MIDDLE)} ${pick(FEMALE_GIVEN)}`
      : `${family} ${pick(MALE_MIDDLE)} ${pick(MALE_GIVEN)}`;
    const user: BulkUser = {
      id: nextId("b1"),
      phone: nextMobile(),
      password_hash: passwordHash,
      full_name: fullName,
      role,
      gender,
      dob: new Date(Date.UTC(int(1975, 2005), int(0, 11), int(1, 28))),
      is_active: true,
      is_verified: true,
      created_at: createdAt,
      updated_at: createdAt,
      ...extra
    };
    users.push(user);
    return user;
  };

  // ── Đối tác, chi nhánh, nhân sự ──
  const partners: PartnerSim[] = [];
  const activeSpecs = PARTNERS.filter((spec) => !spec.approval);
  const partnerRows: Prisma.PartnerCreateManyInput[] = [];
  const branchRows: Prisma.PartnerBranchCreateManyInput[] = [];
  const adminLogs: Prisma.AdminLogCreateManyInput[] = [];

  PARTNERS.forEach((spec, index) => {
    const id = makeId("b2", index + 1);
    // Đối tác gia nhập dần trong ~14 tháng; đối tác chờ duyệt / bị từ chối đăng ký gần đây.
    const activeIndex = activeSpecs.indexOf(spec);
    const approvedDay = spec.approval === "pending"
      ? null
      : spec.approval === "rejected"
        ? TODAY - int(15, 30)
        : FIRST_DAY - 10 + Math.round((activeIndex / activeSpecs.length) ** 1.3 * (HISTORY_DAYS - 40)) + int(0, 6);
    const createdDay = spec.approval === "pending" ? TODAY - int(1, 8) : (approvedDay as number) - int(3, 10);
    const ownerCreated = at(createdDay, between(8, 11));
    const owner = makeUser("partner_owner", ownerCreated, {
      email: `owner.${spec.code.toLowerCase()}@asa.test`,
      is_active: !spec.approval
    });
    // Nhân sự chỉ được tạo sau khi đối tác được duyệt.
    const voucherStaff = spec.approval
      ? null
      : makeUser("partner_voucher_staff", at((approvedDay as number) + 1, between(9, 17)), {
        email: `voucher.${spec.code.toLowerCase()}@asa.test`
      });

    const sim: PartnerSim = {
      spec,
      id,
      ownerId: owner.id,
      voucherStaffId: voucherStaff?.id ?? null,
      approvedDay,
      createdDay,
      suspendDay: spec.suspended ? TODAY - int(20, 30) : null,
      branches: []
    };
    partners.push(sim);

    partnerRows.push({
      id,
      representative_user_id: owner.id,
      business_name: spec.name,
      business_code: `ASA-${spec.code}-001`,
      business_type: spec.type,
      tax_number: `0316${pad(index + 1, 6)}`,
      logo_url: img(CATEGORY_SPECS[spec.categories[0]].images[0], "w=200&h=200&fit=crop&q=80"),
      website_url: spec.website,
      description: spec.description,
      approval_status: spec.approval ?? "approved",
      status: spec.suspended ? "suspended" : "active",
      approved_by: spec.approval === "pending" ? null : ids.users.adminOperations,
      approved_at: approvedDay === null ? null : at(approvedDay, between(9, 17)),
      created_at: at(createdDay, 10),
      updated_at: spec.suspended ? at(sim.suspendDay as number, 10) : at(approvedDay ?? createdDay, 17)
    });

    let branchNo = 0;
    for (const [cityKey, count] of spec.branches) {
      const city = CITIES[cityKey];
      for (let i = 0; i < count; i++) {
        branchNo++;
        const district = pick(city.districts);
        const street = pick(city.streets);
        const branchCreatedDay = (approvedDay ?? createdDay) + int(0, 4);
        const branch: BranchSim = { id: nextId("b3"), partnerIndex: index, city: cityKey, createdDay: branchCreatedDay, staff: [] };
        branchRows.push({
          id: branch.id,
          partner_id: id,
          branch_name: `${spec.name} ${street}`,
          city: city.name,
          district,
          address: `${int(1, 350)} ${street}`,
          phone: `${city.areaCode}3${pad(int(0, 10 ** (10 - city.areaCode.length) - 1), 10 - city.areaCode.length)}`,
          latitude: Number((city.lat + between(-0.04, 0.04)).toFixed(5)),
          longitude: Number((city.lng + between(-0.04, 0.04)).toFixed(5)),
          is_active: true,
          created_at: at(branchCreatedDay, 9)
        });
        // Nhân viên cửa hàng: 1-2 người mỗi chi nhánh (chỉ đối tác đã được duyệt).
        if (!spec.approval) {
          const staffCount = chance(0.55) ? 2 : 1;
          for (let s = 1; s <= staffCount; s++) {
            const staff = makeUser("partner_store_staff", at(branchCreatedDay, between(9, 16)), {
              email: `staff${branchNo}.${s}.${spec.code.toLowerCase()}@asa.test`,
              partner_id: id,
              partner_branches_id: branch.id
            });
            branch.staff.push(staff.id);
          }
        }
        sim.branches.push(branch);
      }
    }

    if (spec.suspended) {
      adminLogs.push({
        id: nextId("bd"),
        admin_id: ids.users.adminOperations,
        target_partner_id: id,
        action: "TOGGLE_STATUS",
        content_type: "partner",
        description: `Tạm ngưng đối tác ${spec.name} do vi phạm cam kết chất lượng dịch vụ`,
        occurred_at: at(sim.suspendDay as number, 10)
      });
    }
  });

  // ── Khách hàng ──
  const buyersByCity = new Map<CityKey, BulkUser[]>();
  const allBuyers: BulkUser[] = [];
  for (let i = 1; i <= BUYER_COUNT; i++) {
    // Tốc độ đăng ký tăng dần theo thời gian (căn bậc hai đảo ngược → nhiều user gần đây hơn).
    const createdDay = FIRST_DAY - 30 + Math.floor(Math.sqrt(rand()) * (HISTORY_DAYS + 29));
    const cityKey = weighted(BUYER_CITY_WEIGHTS);
    const city = CITIES[cityKey];
    const buyer = makeUser("buyer", at(createdDay, shoppingHour()), {
      email: `__pending__${i}`,
      city: city.name,
      district: pick(city.districts),
      address: `${int(1, 500)} ${pick(city.streets)}`,
      is_verified: chance(0.93)
    });
    const given = buyer.full_name.split(" ").pop() as string;
    const family = buyer.full_name.split(" ")[0];
    buyer.email = `${slugify(given)}.${slugify(family)}.${pad(i, 4)}@asa.test`;
    if (!buyersByCity.has(cityKey)) buyersByCity.set(cityKey, []);
    buyersByCity.get(cityKey)!.push(buyer);
    allBuyers.push(buyer);
  }
  const byCreated = (a: BulkUser, b: BulkUser) => a.created_at.getTime() - b.created_at.getTime();
  allBuyers.sort(byCreated);
  for (const list of buyersByCity.values()) list.sort(byCreated);

  /** Chọn ngẫu nhiên khách hàng đã đăng ký trước thời điểm `time`, ưu tiên theo thành phố. */
  function pickBuyer(city: CityKey, time: number, exclude?: string): BulkUser | null {
    const sources = chance(0.9) ? [buyersByCity.get(city) ?? [], allBuyers] : [allBuyers];
    for (const list of sources) {
      let lo = 0;
      let hi = list.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (list[mid].created_at.getTime() < time) lo = mid + 1;
        else hi = mid;
      }
      if (lo === 0) continue;
      for (let attempt = 0; attempt < 4; attempt++) {
        const candidate = list[Math.floor(rand() * lo)];
        if (candidate.id !== exclude) return candidate;
      }
    }
    return null;
  }

  // ── Sản phẩm voucher ──
  const products: ProductSim[] = [];
  const imageRows: Prisma.VoucherProductImageCreateManyInput[] = [];
  const productBranchRows: Prisma.VoucherProductBranchCreateManyInput[] = [];

  for (const partner of partners) {
    if (partner.approvedDay === null || partner.spec.approval) continue;
    const firstStart = partner.approvedDay + 5;
    const lastStart = (partner.suspendDay ?? TODAY + 20) - 5;
    const usedNames = new Set<string>();
    const productCount = Math.round(partner.spec.products * PRODUCT_SCALE);

    for (let n = 0; n < productCount; n++) {
      const spec = CATEGORY_SPECS[pick(partner.spec.categories)];
      const template = pick(spec.templates);
      const [variant, basePrice] = pick(template.variants);

      // Trải đều các đợt mở bán theo thời gian hoạt động của đối tác.
      const slot = (n + rand()) / productCount;
      const startDay = Math.round(firstStart + slot * (lastStart - firstStart));
      const durationDays = pick([30, 30, 45, 60, 60, 90]);
      const endDay = startDay + durationDays - 1;
      const startDate = dateOf(startDay);
      const campaign = `${CAMPAIGNS[startDate.getUTCMonth()]} ${startDate.getUTCFullYear()}`;

      let name = `${template.title.replace("{v}", variant)} | ${campaign}`;
      for (let k = 2; usedNames.has(name); k++) name = `${template.title.replace("{v}", variant)} | ${campaign} - Đợt ${k}`;
      usedNames.add(name);

      const originalPrice = roundThousand(basePrice * between(0.95, 1.08));
      const price = roundThousand(originalPrice * (1 - between(template.discount[0], template.discount[1]) / 100));
      const discountRate = Math.round((1 - price / originalPrice) * 10000) / 100;
      const validityDays = int(template.validity[0], template.validity[1]);
      const totalQuantity = price < 100_000 ? int(10, 60) * 10
        : price < 300_000 ? int(6, 30) * 10
          : price < 1_000_000 ? int(3, 15) * 10
            : int(2, 6) * 10;

      // Chi nhánh áp dụng: toàn bộ chuỗi hoặc chỉ chi nhánh của một thành phố.
      let branches = partner.branches;
      if (partner.branches.length > 1 && chance(0.35)) {
        const city = pick(partner.branches).city;
        branches = partner.branches.filter((b) => b.city === city);
      }
      const cities = [...new Set(branches.map((b) => b.city))];

      // Quy trình: tạo nháp → gửi duyệt → admin duyệt/từ chối.
      const createdDay = Math.max(partner.approvedDay + 1, startDay - int(4, 14));
      const createdAt = at(createdDay, between(9, 17));
      const submittedAt = new Date(createdAt.getTime() + between(0.5, 30) * HOUR);
      const reviewedAt = new Date(submittedAt.getTime() + between(2, 40) * HOUR);
      const reviewed = reviewedAt.getTime() < NOW.getTime() - HOUR;
      const submitted = submittedAt.getTime() < NOW.getTime();
      let approval: "approved" | "pending" | "rejected" = "approved";
      if (!submitted || !reviewed) approval = "pending";
      else if (chance(0.06)) approval = "rejected";
      const isDraftOnly = !submitted || (approval === "pending" && chance(0.25) && createdDay > TODAY - 5);

      const approvedDay = approval === "approved" ? dayOf(reviewedAt.getTime()) : null;
      const sellFrom = approvedDay === null ? Infinity : Math.max(startDay, approvedDay);
      let sellTo = Math.min(endDay, TODAY, (partner.suspendDay ?? Infinity) - 1);
      let pausedDay: number | null = null;
      if (approval === "approved" && sellFrom <= TODAY && endDay >= TODAY && !partner.suspendDay && chance(0.05)) {
        pausedDay = Math.max(sellFrom + 1, TODAY - int(1, 12));
        sellTo = Math.min(sellTo, pausedDay - 1);
      }

      const spread = Math.exp(gaussian() * 0.85);
      const priceFactor = Math.min(3, Math.max(0.25, Math.sqrt(120_000 / price)));
      const id = nextId("b5");
      const images = [...spec.images].sort(() => rand() - 0.5);
      const thumbnail = img(images[0]);

      products.push({
        row: {
          id,
          partner_id: partner.id,
          category_id: spec.id,
          name,
          description: `${template.description.replace("{v}", variant)} Áp dụng tại hệ thống ${partner.spec.name}.`,
          thumbnail_url: thumbnail,
          original_price: originalPrice,
          selling_price: price,
          discount_rate: discountRate,
          applicable_area: cities.map((c) => CITIES[c].name).join(", "),
          total_quantity: totalQuantity,
          remaining_quantity: totalQuantity,
          terms_and_conditions: [...spec.terms].sort(() => rand() - 0.5).slice(0, int(3, Math.min(5, spec.terms.length))),
          usage_instructions: spec.usage,
          sale_start_date: startDate,
          sale_end_date: dateOf(endDay),
          validity_days: validityDays,
          status: "draft",
          approval_status: approval,
          approved_by: approval === "pending" ? null : ids.users.adminContent,
          approved_at: approval === "pending" ? null : reviewedAt,
          created_by: partner.voucherStaffId,
          submitted_by: isDraftOnly ? null : partner.voucherStaffId,
          submitted_at: isDraftOnly ? null : submittedAt,
          created_at: createdAt,
          updated_at: approval === "pending" ? (isDraftOnly ? createdAt : submittedAt) : reviewedAt
        },
        partner,
        spec,
        branches,
        cities,
        sellFrom,
        sellTo,
        price,
        originalPrice,
        discountRate,
        weight: spread * priceFactor,
        remaining: totalQuantity,
        approved: approval === "approved",
        pausedDay
      });

      imageRows.push({ id: nextId("b6"), voucher_product_id: id, image_url: thumbnail, is_primary: true, sort_order: 0 });
      if (images.length > 1 && chance(0.6)) {
        imageRows.push({ id: nextId("b6"), voucher_product_id: id, image_url: img(images[1]), is_primary: false, sort_order: 1 });
      }
      for (const branch of branches) {
        productBranchRows.push({ id: nextId("b7"), voucher_product_id: id, branch_id: branch.id });
      }

      if (approval !== "pending") {
        adminLogs.push({
          id: nextId("bd"),
          admin_id: ids.users.adminContent,
          target_voucher_id: id,
          action: approval === "approved" ? "APPROVE_VOUCHER" : "REJECT_VOUCHER",
          content_type: "voucher",
          description: approval === "approved" ? `Duyệt voucher: ${name}` : `Từ chối voucher: ${name}. Lý do: ${pick(REJECT_REASONS)}`,
          occurred_at: reviewedAt
        });
      }
    }
  }

  // Danh sách voucher đang bán theo từng ngày.
  const sellableByDay = new Map<number, ProductSim[]>();
  for (const product of products) {
    if (!product.approved) continue;
    for (let day = Math.max(product.sellFrom, FIRST_DAY); day <= product.sellTo; day++) {
      if (!sellableByDay.has(day)) sellableByDay.set(day, []);
      sellableByDay.get(day)!.push(product);
    }
  }

  // ── Mô phỏng đơn hàng ──
  const orderRows: Prisma.OrderCreateManyInput[] = [];
  const orderItemRows: Prisma.OrderItemCreateManyInput[] = [];
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];
  const paymentLogRows: Prisma.PaymentLogCreateManyInput[] = [];
  const orderLogRows: Prisma.OrderLogCreateManyInput[] = [];
  const issuedRows: Prisma.IssuedVoucherCreateManyInput[] = [];
  const reviewRows: Prisma.ReviewCreateManyInput[] = [];
  const checkLogRows: Prisma.VoucherCheckLogCreateManyInput[] = [];
  const usedCodes = new Set<string>();
  const usedOrderCodes = new Set<string>();

  const orderCode = (time: number) => {
    let code: string;
    do code = `ORD${time + int(0, 999)}${int(1000, 9999)}`; while (usedOrderCodes.has(code));
    usedOrderCodes.add(code);
    return code;
  };
  const voucherCode = (time: number) => {
    let code: string;
    do code = `VC${time + int(0, 50)}${int(100000, 999999)}`; while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  };
  const vnpTxnNo = () => String(int(14_000_000, 14_999_999));
  const paypalId = () => Array.from({ length: 17 }, () => pick([..."ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"])).join("");
  const nowMs = NOW.getTime();

  function pickWeighted(list: ProductSim[], filter?: (p: ProductSim) => boolean): ProductSim | null {
    const pool = filter ? list.filter(filter) : list;
    if (pool.length === 0) return null;
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = rand() * total;
    for (const p of pool) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  for (let day = FIRST_DAY; day <= TODAY; day++) {
    const sellable = sellableByDay.get(day);
    if (!sellable || sellable.length === 0) continue;
    const progress = (day - FIRST_DAY) / HISTORY_DAYS;
    const base = ORDERS_PER_DAY_START + (ORDERS_PER_DAY_END - ORDERS_PER_DAY_START) * progress;
    // Quy mô đơn tỉ lệ với độ phủ catalog (đầu kỳ ít đối tác thì ít đơn).
    const coverage = Math.min(1, sellable.length / 120);
    const count = Math.max(0, Math.round(base * demandMultiplier(day) * (0.55 + 0.45 * coverage) * (0.8 + rand() * 0.4)));

    for (let n = 0; n < count; n++) {
      const created = at(day, shoppingHour()).getTime();
      if (created > nowMs - 20 * MINUTE) continue; // đơn trong 20 phút gần nhất sẽ còn đang chờ thanh toán → bỏ qua

      const primary = pickWeighted(sellable, (p) => p.remaining > 0);
      if (!primary) break;
      const city = pick(primary.cities);
      const buyer = pickBuyer(city, created);
      if (!buyer) continue;

      // Giỏ hàng: 1 voucher là chủ yếu, đôi khi mua kèm voucher khác cùng khu vực.
      const lines: Array<{ product: ProductSim; quantity: number }> = [];
      const quantityFor = (p: ProductSim) => {
        const q = p.price < 150_000 ? weighted([[1, 55], [2, 30], [3, 8], [4, 7]] as const) : p.price < 1_000_000 ? weighted([[1, 75], [2, 22], [3, 3]] as const) : 1;
        return Math.min(q, p.remaining);
      };
      lines.push({ product: primary, quantity: quantityFor(primary) });
      const extra = weighted([[0, 82], [1, 14], [2, 4]] as const);
      for (let e = 0; e < extra; e++) {
        const other = pickWeighted(sellable, (p) => p.remaining > 0 && p.cities.includes(city) && !lines.some((l) => l.product === p));
        if (other) lines.push({ product: other, quantity: quantityFor(other) });
      }

      const isGift = chance(0.05);
      const recipient = isGift ? pickBuyer(city, created, buyer.id) ?? buyer : buyer;
      const method = chance(0.74) ? "vnpay" : "paypal";
      const orderId = nextId("b8");
      const code = orderCode(created);
      const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

      // Kết cục của đơn: thanh toán thành công / hết hạn thanh toán / thanh toán lỗi / khách tự hủy.
      const outcome = weighted([["paid", 84], ["expired", 9], ["failed", 4.5], ["cancelled", 2.5]] as const);
      const paymentCreated = created + between(0.3, 3) * MINUTE;
      const paymentId = nextId("b9");
      const hasPayment = outcome === "paid" || outcome === "failed" || chance(0.55);
      const txnRef = method === "vnpay" ? `${code.slice(3)}` : paypalId();

      const items = lines.map((line) => {
        const itemId = nextId("ba");
        orderItemRows.push({
          id: itemId,
          order_id: orderId,
          voucher_product_id: line.product.row.id,
          quantity: line.quantity,
          unit_price: line.product.price,
          snapped_original_price: line.product.originalPrice,
          snapped_selling_price: line.product.price,
          snapped_discount_rate: line.product.discountRate,
          subtotal: line.product.price * line.quantity,
          created_at: new Date(created)
        });
        return { ...line, itemId };
      });

      orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: buyer.id, action: "CREATE_ORDER", description: "Order created", occurred_at: new Date(created) });
      if (hasPayment) {
        paymentLogRows.push({ id: nextId("bc"), payment_id: paymentId, order_id: orderId, user_id: buyer.id, action: "PAYMENT_CREATED", status: "pending", amount: subtotal, occurred_at: new Date(paymentCreated) });
      }

      const order: Prisma.OrderCreateManyInput = {
        id: orderId,
        order_code: code,
        user_id: buyer.id,
        recipient_id: recipient.id,
        is_gift: recipient.id !== buyer.id,
        subtotal,
        discount_amount: 0,
        total_amount: subtotal,
        refund_amount: 0,
        payment_method: method,
        payment_expires_at: new Date(created + 15 * MINUTE),
        note: recipient.id !== buyer.id ? pick(["Quà sinh nhật", "Tặng bạn thân", "Quà cảm ơn đồng nghiệp", "Quà tặng gia đình"]) : null,
        status: "cancelled",
        payment_status: "failed",
        created_at: new Date(created),
        updated_at: new Date(created + 15 * MINUTE)
      };
      orderRows.push(order);

      if (outcome !== "paid") {
        const failedAt = paymentCreated + between(1, 6) * MINUTE;
        if (outcome === "failed") {
          const [codeRes, message] = method === "vnpay"
            ? pick([["24", "Khách hàng hủy giao dịch"], ["51", "Tài khoản không đủ số dư"], ["11", "Hết hạn chờ thanh toán"], ["79", "Nhập sai mật khẩu thanh toán quá số lần quy định"]] as const)
            : pick([["INSTRUMENT_DECLINED", "Phương thức thanh toán bị từ chối"], ["PAYER_ACTION_REQUIRED", "Người mua chưa hoàn tất xác thực"]] as const);
          paymentRows.push({
            id: paymentId, order_id: orderId, method, amount: subtotal, status: "failed", transaction_ref: txnRef,
            gateway_response: JSON.stringify({ provider_response: method === "vnpay" ? { vnp_ResponseCode: codeRes, vnp_TxnRef: txnRef, message } : { id: txnRef, status: codeRes, message } }),
            created_at: new Date(paymentCreated)
          });
          paymentLogRows.push({ id: nextId("bc"), payment_id: paymentId, order_id: orderId, user_id: buyer.id, action: "PAYMENT_FAILED", status: "failed", amount: subtotal, occurred_at: new Date(failedAt) });
          orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: buyer.id, action: "CANCEL_ORDER_EXPIRED", description: "Order cancelled because the payment window expired", occurred_at: new Date(created + 15 * MINUTE) });
        } else if (outcome === "expired") {
          if (hasPayment) {
            paymentRows.push({ id: paymentId, order_id: orderId, method, amount: subtotal, status: "failed", transaction_ref: txnRef, gateway_response: "ORDER_PAYMENT_EXPIRED", created_at: new Date(paymentCreated) });
          }
          orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: buyer.id, action: "CANCEL_ORDER_EXPIRED", description: "Order cancelled because the payment window expired", occurred_at: new Date(created + 15 * MINUTE) });
        } else {
          const cancelledAt = created + between(1, 12) * MINUTE;
          const reason = pick(["Đổi ý, muốn chọn voucher khác", "Đặt nhầm số lượng", "Muốn đổi phương thức thanh toán"]);
          order.updated_at = new Date(cancelledAt);
          if (hasPayment) {
            paymentRows.push({ id: paymentId, order_id: orderId, method, amount: subtotal, status: "failed", transaction_ref: txnRef, gateway_response: reason, created_at: new Date(paymentCreated) });
            paymentLogRows.push({ id: nextId("bc"), payment_id: paymentId, order_id: orderId, user_id: buyer.id, action: "PAYMENT_CANCELLED_WITH_ORDER", status: "failed", amount: subtotal, occurred_at: new Date(cancelledAt) });
          }
          orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: buyer.id, action: "CANCEL_ORDER", description: reason, occurred_at: new Date(cancelledAt) });
        }
        continue;
      }

      // ── Thanh toán thành công → phát hành mã ──
      const paidAt = paymentCreated + between(1, 8) * MINUTE;
      const issuedDay = dayOf(paidAt);
      const vnpPayDate = new Date(paidAt + TZ_OFFSET).toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const payment: Prisma.PaymentCreateManyInput = {
        id: paymentId, order_id: orderId, method, amount: subtotal, status: "success", transaction_ref: txnRef,
        gateway_response: JSON.stringify({
          provider_response: method === "vnpay"
            ? { vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TxnRef: txnRef, vnp_TransactionNo: vnpTxnNo(), vnp_Amount: String(subtotal * 100), vnp_BankCode: pick(["NCB", "VCB", "TCB", "MB", "ACB", "VIB"]), vnp_PayDate: vnpPayDate }
            : { id: txnRef, status: "COMPLETED", capture_id: paypalId() }
        }),
        paid_at: new Date(paidAt),
        created_at: new Date(paymentCreated)
      };
      paymentRows.push(payment);
      paymentLogRows.push({ id: nextId("bc"), payment_id: paymentId, order_id: orderId, user_id: buyer.id, action: "PAYMENT_SUCCESS", status: "success", amount: subtotal, occurred_at: new Date(paidAt) });
      orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: buyer.id, action: "PAYMENT_SUCCESS", description: "Payment completed and vouchers issued", occurred_at: new Date(paidAt) });
      order.status = "confirmed";
      order.payment_status = "paid";
      order.updated_at = new Date(paidAt);

      // Một phần nhỏ đơn bị admin hủy và hoàn tiền trước khi sử dụng mã.
      const cancelAt = paidAt + between(2, 40) * HOUR;
      const refundAt = cancelAt + between(1, 20) * HOUR;
      const refunded = chance(0.018) && refundAt < nowMs - HOUR;

      let allUsed = true;
      let lastUsedAt = 0;
      let lastStaff = "";
      for (const item of items) {
        const product = item.product;
        if (!refunded) product.remaining -= item.quantity;
        for (let q = 0; q < item.quantity; q++) {
          const code = voucherCode(paidAt);
          const expiredDay = issuedDay + product.row.validity_days;
          const issued: Prisma.IssuedVoucherCreateManyInput = {
            id: nextId("be"),
            voucher_code: code,
            qr_code_payload: code,
            order_item_id: item.itemId,
            voucher_product_id: product.row.id,
            owner_id: recipient.id,
            issued_date: dateOf(issuedDay),
            expired_date: dateOf(expiredDay),
            status: "active",
            created_at: new Date(paidAt),
            updated_at: new Date(paidAt)
          };
          issuedRows.push(issued);

          if (refunded) {
            issued.status = "revoked";
            issued.updated_at = new Date(cancelAt);
            allUsed = false;
            continue;
          }

          // Thời điểm đổi mã: phần lớn trong nửa đầu thời hạn, vào giờ mở cửa.
          const willUse = chance(USAGE_RATE[product.spec.group]);
          const useDay = issuedDay + Math.floor(rand() ** 1.6 * (product.row.validity_days + 1));
          const branch = pick(product.branches);
          const usedAt = at(useDay, between(9, 21)).getTime();
          const partnerOpen = product.partner.suspendDay === null || useDay < product.partner.suspendDay;
          if (willUse && partnerOpen && usedAt > paidAt + 10 * MINUTE && usedAt < nowMs - 5 * MINUTE && useDay <= expiredDay && branch.staff.length > 0) {
            const staffId = pick(branch.staff);
            issued.status = "used";
            issued.branch_id = branch.id;
            issued.redeemed_by = staffId;
            issued.used_at = new Date(usedAt);
            issued.updated_at = new Date(usedAt);
            if (chance(0.04)) {
              checkLogRows.push({ id: nextId("bf"), user_id: staffId, voucher_code: code.slice(0, -1) + ((Number(code.slice(-1)) + 1) % 10), status: "failed", reason: "Mã không tồn tại", created_at: new Date(usedAt - between(0.5, 2) * MINUTE) });
            }
            checkLogRows.push({ id: nextId("bf"), user_id: staffId, voucher_code: code, status: "success", created_at: new Date(usedAt) });
            if (usedAt > lastUsedAt) {
              lastUsedAt = usedAt;
              lastStaff = staffId;
            }

            if (!order.is_gift && chance(0.32)) {
              const reviewAt = usedAt + between(1, 96) * HOUR;
              if (reviewAt < nowMs) {
                const rating = weighted([[5, 52], [4, 29], [3, 11], [2, 5], [1, 3]] as const);
                const comments = REVIEW_COMMENTS[product.spec.group];
                const comment = pick(rating >= 4 ? comments.good : rating === 3 ? comments.ok : comments.bad);
                reviewRows.push({
                  id: nextId("c1"),
                  voucher_product_id: product.row.id,
                  user_id: recipient.id,
                  issued_voucher_id: issued.id as string,
                  rating,
                  comment,
                  is_published: true,
                  created_at: new Date(reviewAt),
                  updated_at: new Date(reviewAt)
                });
              }
            }
          } else {
            allUsed = false;
            if (expiredDay < TODAY) {
              issued.status = "expired";
              issued.updated_at = at(expiredDay + 1, 0);
              if (chance(0.05) && branch.staff.length > 0) {
                const tryAt = at(expiredDay + int(1, 5), between(9, 21)).getTime();
                if (tryAt < nowMs) {
                  checkLogRows.push({ id: nextId("bf"), user_id: pick(branch.staff), voucher_code: code, status: "failed", reason: "Voucher đã hết hạn", created_at: new Date(tryAt) });
                }
              }
            }
          }
        }
      }

      if (refunded) {
        order.status = "refunded";
        order.payment_status = "refunded";
        order.refund_amount = subtotal;
        order.updated_at = new Date(refundAt);
        payment.status = "refunded";
        payment.refunded_at = new Date(refundAt);
        payment.refund_ref = method === "vnpay" ? `RF${vnpTxnNo()}` : paypalId();
        const reason = pick(["Khách hàng thay đổi lịch trình, yêu cầu hủy đơn", "Đối tác tạm ngưng dịch vụ tại chi nhánh", "Khách đặt trùng đơn"]);
        orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: ids.users.adminOperations, action: "CANCEL_ORDER", description: reason, occurred_at: new Date(cancelAt) });
        orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: ids.users.adminOperations, action: "REFUND_ORDER", description: `Hoàn tiền (gateway ref: ${payment.refund_ref}): ${reason}`, occurred_at: new Date(refundAt) });
        paymentLogRows.push({ id: nextId("bc"), payment_id: paymentId, order_id: orderId, user_id: ids.users.adminOperations, action: "REFUND", status: "refunded", amount: subtotal, occurred_at: new Date(refundAt) });
        adminLogs.push({ id: nextId("bd"), admin_id: ids.users.adminOperations, target_order_id: orderId, action: "order.cancel", description: `Hủy đơn ${code}`, occurred_at: new Date(cancelAt) });
        adminLogs.push({ id: nextId("bd"), admin_id: ids.users.adminOperations, target_order_id: orderId, action: "order.refund", description: `Hoàn tiền đơn ${code} (${payment.refund_ref})`, occurred_at: new Date(refundAt) });
      } else if (allUsed) {
        order.status = "completed";
        order.updated_at = new Date(lastUsedAt);
        orderLogRows.push({ id: nextId("bb"), order_id: orderId, user_id: lastStaff, action: "COMPLETE_ORDER", description: "All issued vouchers have been used", occurred_at: new Date(lastUsedAt) });
      }
    }
  }

  // ── Trạng thái cuối của voucher theo tồn kho và thời gian ──
  for (const product of products) {
    const row = product.row;
    row.remaining_quantity = product.remaining;
    if (!product.approved) continue;
    const endDay = dayOf((row.sale_end_date as Date).getTime());
    if (product.remaining === 0) row.status = "sold_out";
    else if (endDay < TODAY) row.status = "expired";
    else if (product.pausedDay !== null || product.partner.suspendDay !== null) row.status = "paused";
    else row.status = "active";
    if (product.pausedDay !== null) row.updated_at = at(product.pausedDay, 10);
  }

  // ── Giỏ hàng hiện tại của một số khách ──
  const cartRows: Prisma.CartCreateManyInput[] = [];
  const cartItemRows: Prisma.CartItemCreateManyInput[] = [];
  const liveProducts = products.filter((p) => p.row.status === "active" && p.sellFrom <= TODAY);
  const cartOwners = new Set<string>();
  for (let i = 0; i < CART_COUNT && liveProducts.length > 0; i++) {
    const buyer = pick(allBuyers);
    if (cartOwners.has(buyer.id)) continue;
    cartOwners.add(buyer.id);
    const cartId = nextId("c2");
    const updated = new Date(nowMs - between(1, 20 * 24) * HOUR);
    cartRows.push({ id: cartId, user_id: buyer.id, created_at: new Date(Math.max(buyer.created_at.getTime(), updated.getTime() - 30 * DAY)), updated_at: updated });
    const chosen = new Set<ProductSim>();
    for (let k = int(1, 3); k > 0; k--) chosen.add(pick(liveProducts));
    for (const product of chosen) {
      cartItemRows.push({ id: nextId("c3"), cart_id: cartId, voucher_product_id: product.row.id, quantity: Math.min(int(1, 2), product.remaining), created_at: updated, updated_at: updated });
    }
  }

  // ── Ghi vào DB ──
  console.log("Ghi dữ liệu bulk:");
  for (const category of categoryRows) {
    await prisma.category.upsert({ where: { id: category.id }, create: category, update: category });
  }
  console.log(`  • categories (mới): ${categoryRows.length}`);
  await insertChunks("users", users, (chunk) => prisma.user.createMany({
    data: chunk.map(({ partner_id: _p, partner_branches_id: _b, ...user }) => user)
  }));
  await insertChunks("partners", partnerRows, (chunk) => prisma.partner.createMany({ data: chunk }));
  await insertChunks("partner_branches", branchRows, (chunk) => prisma.partnerBranch.createMany({ data: chunk }));

  // Gắn nhân sự vào đối tác/chi nhánh sau khi đã có partner & branch.
  for (const partner of partners) {
    await prisma.user.update({ where: { id: partner.ownerId }, data: { partner_id: partner.id } });
    if (partner.voucherStaffId) {
      await prisma.user.update({ where: { id: partner.voucherStaffId }, data: { partner_id: partner.id, partner_branches_id: partner.branches[0]?.id ?? null } });
    }
    for (const branch of partner.branches) {
      if (branch.staff.length === 0) continue;
      await prisma.user.updateMany({ where: { id: { in: branch.staff } }, data: { partner_id: partner.id, partner_branches_id: branch.id } });
    }
  }
  console.log("  • gán nhân sự vào đối tác/chi nhánh: xong");

  await insertChunks("voucher_products", products.map((p) => p.row), (chunk) => prisma.voucherProduct.createMany({ data: chunk }));
  await insertChunks("voucher_product_images", imageRows, (chunk) => prisma.voucherProductImage.createMany({ data: chunk }));
  await insertChunks("voucher_product_branches", productBranchRows, (chunk) => prisma.voucherProductBranch.createMany({ data: chunk }));
  await insertChunks("carts", cartRows, (chunk) => prisma.cart.createMany({ data: chunk }));
  await insertChunks("cart_items", cartItemRows, (chunk) => prisma.cartItem.createMany({ data: chunk }));
  await insertChunks("orders", orderRows, (chunk) => prisma.order.createMany({ data: chunk }));
  await insertChunks("order_items", orderItemRows, (chunk) => prisma.orderItem.createMany({ data: chunk }));
  await insertChunks("payments", paymentRows, (chunk) => prisma.payment.createMany({ data: chunk }));
  await insertChunks("payment_logs", paymentLogRows, (chunk) => prisma.paymentLog.createMany({ data: chunk }));
  await insertChunks("order_logs", orderLogRows, (chunk) => prisma.orderLog.createMany({ data: chunk }));
  await insertChunks("issued_vouchers", issuedRows, (chunk) => prisma.issuedVoucher.createMany({ data: chunk }));
  await insertChunks("reviews", reviewRows, (chunk) => prisma.review.createMany({ data: chunk }));
  await insertChunks("voucher_check_logs", checkLogRows, (chunk) => prisma.voucherCheckLog.createMany({ data: chunk }));
  await insertChunks("admin_logs", adminLogs, (chunk) => prisma.adminLog.createMany({ data: chunk }));

  // ── Tổng kết (số liệu cho README / CV) ──
  const listed = products.filter((p) => p.approved);
  const partnersWithVouchers = new Set(listed.map((p) => p.partner.id)).size;
  const leafCategories = new Set(listed.map((p) => p.row.category_id)).size;
  const paidOrders = orderRows.filter((o) => o.payment_status === "paid");
  const gmv = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const usedCount = issuedRows.filter((v) => v.status === "used").length;
  console.log("\nTổng kết bulk seed:");
  console.log(`  - Voucher (sản phẩm): ${products.length} (đã duyệt ${listed.length}) / ${partnersWithVouchers} đối tác / ${leafCategories} danh mục`);
  console.log(`  - Mã voucher đã phát hành: ${issuedRows.length} (đã sử dụng ${usedCount})`);
  console.log(`  - Đơn hàng: ${orderRows.length} (thanh toán thành công ${paidOrders.length}), GMV ${gmv.toLocaleString("vi-VN")}đ`);
  console.log(`  - Khách hàng: ${BUYER_COUNT}, đánh giá: ${reviewRows.length}`);
}
