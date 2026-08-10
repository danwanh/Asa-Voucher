import { Prisma } from "@prisma/client";
import type { SeedContext } from "./shared.js";
import { ids, now, daysFrom, money } from "./shared.js";

type CategorySeed = {
  id: string;
  parent_id?: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
};

type PartnerSeed = {
  id: string;
  representative_user_id: string;
  business_name: string;
  business_code: string;
  business_type: string;
  tax_number: string;
  logo_url: string;
  website_url: string;
  description: string;
  approval_status: "pending" | "approved" | "rejected";
  status: "active" | "suspended" | "closed";
  approved_by?: string;
  approved_at?: Date;
};

type BranchSeed = {
  id: string;
  partner_id: string;
  branch_name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
};

type VoucherSeed = {
  id: string;
  partner_id: string;
  category_id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  original_price: number;
  selling_price: number;
  discount_rate: number;
  applicable_area: string;
  total_quantity: number;
  remaining_quantity: number;
  terms_and_conditions: Prisma.InputJsonValue;
  usage_instructions: Prisma.InputJsonValue;
  sale_start_date: Date;
  sale_end_date: Date;
  validity_days: number;
  status: "draft" | "active" | "paused" | "sold_out" | "expired";
  approval_status: "pending" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: Date;
};

const categories: CategorySeed[] = [
  { id: ids.categories.anUong, name: "Ăn uống", slug: "an-uong", description: "Voucher ẩm thực tại nhà hàng và quán ăn", sort_order: 1 },
  { id: ids.categories.caPhe, parent_id: ids.categories.anUong, name: "Cà phê", slug: "ca-phe", description: "Voucher đồ uống cà phê", sort_order: 2 },
  { id: ids.categories.traSua, parent_id: ids.categories.anUong, name: "Trà sữa", slug: "tra-sua", description: "Voucher trà sữa và đồ uống hiện đại", sort_order: 3 },
  { id: ids.categories.buffet, parent_id: ids.categories.anUong, name: "Buffet", slug: "buffet", description: "Voucher buffet không giới hạn", sort_order: 4 },
  { id: ids.categories.giaiTri, name: "Giải trí", slug: "giai-tri", description: "Voucher vui chơi và trải nghiệm", sort_order: 5 },
  { id: ids.categories.veXemPhim, parent_id: ids.categories.giaiTri, name: "Vé xem phim", slug: "ve-xem-phim", description: "Voucher rạp chiếu phim", sort_order: 6 },
  { id: ids.categories.karaoke, parent_id: ids.categories.giaiTri, name: "Karaoke", slug: "karaoke", description: "Voucher phòng hát karaoke", sort_order: 7 },
  { id: ids.categories.chamSocSucKhoe, name: "Chăm sóc sức khỏe", slug: "cham-soc-suc-khoe", description: "Voucher chăm sóc cơ thể", sort_order: 8 },
  { id: ids.categories.spaMassage, parent_id: ids.categories.chamSocSucKhoe, name: "Spa và Massage", slug: "spa-massage", description: "Voucher spa và thư giãn", sort_order: 9 },
  { id: ids.categories.duLichNghiDuong, name: "Du lịch và nghỉ dưỡng", slug: "du-lich-nghi-duong", description: "Voucher kỳ nghỉ và vui chơi", sort_order: 10 },
  { id: ids.categories.khachSanResort, parent_id: ids.categories.duLichNghiDuong, name: "Khách sạn và Resort", slug: "khach-san-resort", description: "Voucher lưu trú tại resort", sort_order: 11 }
];

const partners: PartnerSeed[] = [
  {
    id: ids.partners.highlands,
    representative_user_id: ids.users.ownerHighlands,
    business_name: "Highlands Coffee Việt Nam",
    business_code: "ASA-HIGHLANDS-001",
    business_type: "restaurant",
    tax_number: "0312345601",
    logo_url: "https://cdn.asa.test/logo/highlands.png",
    website_url: "https://www.highlandscoffee.com.vn",
    description: "Chuỗi cà phê phong cách Việt Nam với nhiều chi nhánh trung tâm.",
    approval_status: "approved",
    status: "active",
    approved_by: ids.users.adminOperations,
    approved_at: daysFrom(now, -120)
  },
  {
    id: ids.partners.phucLong,
    representative_user_id: ids.users.ownerPhucLong,
    business_name: "Phúc Long Heritage",
    business_code: "ASA-PHUCLONG-001",
    business_type: "restaurant",
    tax_number: "0312345602",
    logo_url: "https://cdn.asa.test/logo/phuclong.png",
    website_url: "https://phuclong.com.vn",
    description: "Thương hiệu trà và cà phê nổi tiếng tại Việt Nam.",
    approval_status: "approved",
    status: "active",
    approved_by: ids.users.adminOperations,
    approved_at: daysFrom(now, -110)
  },
  {
    id: ids.partners.pizzaHut,
    representative_user_id: ids.users.ownerPizzaHut,
    business_name: "Pizza Hut Việt Nam",
    business_code: "ASA-PIZZAHUT-001",
    business_type: "restaurant",
    tax_number: "0312345603",
    logo_url: "https://cdn.asa.test/logo/pizzahut.png",
    website_url: "https://www.pizzahut.vn",
    description: "Hệ thống nhà hàng pizza với nhiều combo gia đình.",
    approval_status: "approved",
    status: "suspended",
    approved_by: ids.users.adminOperations,
    approved_at: daysFrom(now, -100)
  },
  {
    id: ids.partners.cgv,
    representative_user_id: ids.users.ownerCGV,
    business_name: "CGV Cinemas Việt Nam",
    business_code: "ASA-CGV-001",
    business_type: "entertainment",
    tax_number: "0312345604",
    logo_url: "https://cdn.asa.test/logo/cgv.png",
    website_url: "https://www.cgv.vn",
    description: "Chuỗi rạp chiếu phim hiện đại tại các trung tâm thương mại.",
    approval_status: "approved",
    status: "active",
    approved_by: ids.users.adminOperations,
    approved_at: daysFrom(now, -96)
  },
  {
    id: ids.partners.gogi,
    representative_user_id: ids.users.ownerGogi,
    business_name: "Gogi House Việt Nam",
    business_code: "ASA-GOGI-001",
    business_type: "restaurant",
    tax_number: "0312345605",
    logo_url: "https://cdn.asa.test/logo/gogi.png",
    website_url: "https://gogi.com.vn",
    description: "Nhà hàng nướng Hàn Quốc chuyên set và buffet.",
    approval_status: "pending",
    status: "active"
  },
  {
    id: ids.partners.vinpearl,
    representative_user_id: ids.users.ownerVinpearl,
    business_name: "Vinpearl Resort",
    business_code: "ASA-VINPEARL-001",
    business_type: "hotel",
    tax_number: "0312345606",
    logo_url: "https://cdn.asa.test/logo/vinpearl.png",
    website_url: "https://vinpearl.com",
    description: "Khu nghỉ dưỡng và trải nghiệm du lịch cao cấp.",
    approval_status: "rejected",
    status: "closed",
    approved_by: ids.users.adminOperations,
    approved_at: daysFrom(now, -70)
  }
];

const branches: BranchSeed[] = [
  {
    id: ids.branches.highlandsQ1,
    partner_id: ids.partners.highlands,
    branch_name: "Highlands Coffee Đồng Khởi",
    address: "23 Đồng Khởi",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    phone: "02873001231",
    latitude: 10.77736,
    longitude: 106.70261,
    is_active: true
  },
  {
    id: ids.branches.highlandsTDB,
    partner_id: ids.partners.highlands,
    branch_name: "Highlands Coffee Tôn Đức Thắng",
    address: "40 Tôn Đức Thắng",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    phone: "02873001232",
    latitude: 10.77748,
    longitude: 106.7082,
    is_active: true
  },
  {
    id: ids.branches.highlandsLandmark81,
    partner_id: ids.partners.highlands,
    branch_name: "Highlands Coffee Landmark 81",
    address: "Vinhomes Central Park, 720A Điện Biên Phủ",
    city: "TP. Hồ Chí Minh",
    district: "Bình Thạnh",
    phone: "02873001233",
    latitude: 10.79485,
    longitude: 106.72195,
    is_active: true
  },
  {
    id: ids.branches.phucLongQ3,
    partner_id: ids.partners.phucLong,
    branch_name: "Phúc Long Nam Kỳ Khởi Nghĩa",
    address: "177 Nam Kỳ Khởi Nghĩa",
    city: "TP. Hồ Chí Minh",
    district: "Quận 3",
    phone: "02873002231",
    latitude: 10.78373,
    longitude: 106.68442,
    is_active: true
  },
  {
    id: ids.branches.phucLongGoVap,
    partner_id: ids.partners.phucLong,
    branch_name: "Phúc Long Phan Văn Trị",
    address: "530 Phan Văn Trị",
    city: "TP. Hồ Chí Minh",
    district: "Gò Vấp",
    phone: "02873002232",
    latitude: 10.82895,
    longitude: 106.68876,
    is_active: true
  },
  {
    id: ids.branches.pizzaHutPMH,
    partner_id: ids.partners.pizzaHut,
    branch_name: "Pizza Hut Phú Mỹ Hưng",
    address: "R4-31 Hưng Phước 4, Nguyễn Văn Linh",
    city: "TP. Hồ Chí Minh",
    district: "Quận 7",
    phone: "02873003231",
    latitude: 10.73064,
    longitude: 106.70837,
    is_active: false
  },
  {
    id: ids.branches.pizzaHutBaTrieu,
    partner_id: ids.partners.pizzaHut,
    branch_name: "Pizza Hut Bà Triệu",
    address: "191 Bà Triệu",
    city: "Hà Nội",
    district: "Hai Bà Trưng",
    phone: "02473003232",
    latitude: 21.01395,
    longitude: 105.84926,
    is_active: true
  },
  {
    id: ids.branches.cgvVincom,
    partner_id: ids.partners.cgv,
    branch_name: "CGV Vincom Đồng Khởi",
    address: "72 Lê Thánh Tôn, Vincom Center",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    phone: "02873004231",
    latitude: 10.77812,
    longitude: 106.70172,
    is_active: true
  },
  {
    id: ids.branches.cgvAeon,
    partner_id: ids.partners.cgv,
    branch_name: "CGV Aeon Tân Phú",
    address: "30 Bờ Bao Tân Thắng, Aeon Mall",
    city: "TP. Hồ Chí Minh",
    district: "Tân Phú",
    phone: "02873004232",
    latitude: 10.80173,
    longitude: 106.62762,
    is_active: true
  },
  {
    id: ids.branches.gogiDN,
    partner_id: ids.partners.gogi,
    branch_name: "Gogi House Bạch Đằng",
    address: "258 Bạch Đằng",
    city: "Đà Nẵng",
    district: "Hải Châu",
    phone: "02367300541",
    latitude: 16.06732,
    longitude: 108.22425,
    is_active: true
  },
  {
    id: ids.branches.gogiBiThu,
    partner_id: ids.partners.gogi,
    branch_name: "Gogi House Nguyễn Văn Linh",
    address: "116 Nguyễn Văn Linh",
    city: "Đà Nẵng",
    district: "Thanh Khê",
    phone: "02367300542",
    latitude: 16.06041,
    longitude: 108.21437,
    is_active: true
  },
  {
    id: ids.branches.vinpearlNT,
    partner_id: ids.partners.vinpearl,
    branch_name: "Vinpearl Resort Nha Trang",
    address: "Đảo Hòn Tre",
    city: "Nha Trang",
    district: "Vĩnh Nguyên",
    phone: "02587300651",
    latitude: 12.21121,
    longitude: 109.24364,
    is_active: true
  }
];

const vouchers: VoucherSeed[] = [
  {
    id: ids.vouchers.highlandsBogo,
    partner_id: ids.partners.highlands,
    category_id: ids.categories.caPhe,
    name: "Mua 1 tặng 1 Highlands Coffee size vừa",
    description: "Áp dụng cho các dòng Freeze và Trà Sen Vàng tại chi nhánh TP. Hồ Chí Minh.",
    thumbnail_url: "https://cdn.asa.test/voucher/highlands-bogo.jpg",
    original_price: 118000,
    selling_price: 69000,
    discount_rate: 41.53,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 500,
    remaining_quantity: 320,
    terms_and_conditions: ["Không áp dụng ngày lễ", "Mỗi hóa đơn tối đa 2 voucher"],
    usage_instructions: ["Đưa mã voucher tại quầy", "Đặt món trong khung giờ hoạt động"],
    sale_start_date: daysFrom(now, -20),
    sale_end_date: daysFrom(now, 40),
    validity_days: 30,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -19)
  },
  {
    id: ids.vouchers.highlandsBreakfast,
    partner_id: ids.partners.highlands,
    category_id: ids.categories.caPhe,
    name: "Combo sáng Highlands: Bánh mì + Cà phê sữa",
    description: "Combo ăn sáng tiết kiệm dành cho khách văn phòng.",
    thumbnail_url: "https://cdn.asa.test/voucher/highlands-breakfast.jpg",
    original_price: 85000,
    selling_price: 59000,
    discount_rate: 30.59,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 300,
    remaining_quantity: 0,
    terms_and_conditions: ["Áp dụng trước 10:30", "Không cộng dồn khuyến mãi khác"],
    usage_instructions: ["Quét QR tại quầy", "Sử dụng trong 1 lần"],
    sale_start_date: daysFrom(now, -50),
    sale_end_date: daysFrom(now, -2),
    validity_days: 10,
    status: "sold_out",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -49)
  },
  {
    id: ids.vouchers.highlandsCombo,
    partner_id: ids.partners.highlands,
    category_id: ids.categories.caPhe,
    name: "Combo Highlands 2 nước tự chọn",
    description: "Chọn 2 thức uống bất kỳ từ menu dưới 69.000 VNĐ/ly.",
    thumbnail_url: "https://cdn.asa.test/voucher/highlands-combo-2.jpg",
    original_price: 138000,
    selling_price: 99000,
    discount_rate: 28.26,
    applicable_area: "Toàn quốc",
    total_quantity: 600,
    remaining_quantity: 420,
    terms_and_conditions: ["Không đổi món tiền thừa", "Áp dụng tại cửa hàng tham gia"],
    usage_instructions: ["Hiển thị mã cho thu ngân", "Xác nhận sử dụng ngay tại quầy"],
    sale_start_date: daysFrom(now, -5),
    sale_end_date: daysFrom(now, 25),
    validity_days: 20,
    status: "paused",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -5)
  },
  {
    id: ids.vouchers.phucLongSizeL,
    partner_id: ids.partners.phucLong,
    category_id: ids.categories.traSua,
    name: "Trà sữa Phúc Long size L giảm 35%",
    description: "Áp dụng cho các dòng trà sữa truyền thống và matcha.",
    thumbnail_url: "https://cdn.asa.test/voucher/phuclong-size-l.jpg",
    original_price: 62000,
    selling_price: 40000,
    discount_rate: 35.48,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 700,
    remaining_quantity: 510,
    terms_and_conditions: ["Không áp dụng topping đặc biệt", "Sử dụng trong ngày"],
    usage_instructions: ["Đưa QR cho nhân viên", "Nhận đồ uống tại quầy"],
    sale_start_date: daysFrom(now, -12),
    sale_end_date: daysFrom(now, 35),
    validity_days: 15,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -12)
  },
  {
    id: ids.vouchers.phucLongTeaSet,
    partner_id: ids.partners.phucLong,
    category_id: ids.categories.caPhe,
    name: "Set trà và bánh Phúc Long cho 2 người",
    description: "Set gồm 2 ly trà trái cây và 1 phần bánh ngọt.",
    thumbnail_url: "https://cdn.asa.test/voucher/phuclong-tea-set.jpg",
    original_price: 180000,
    selling_price: 125000,
    discount_rate: 30.56,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 200,
    remaining_quantity: 120,
    terms_and_conditions: ["Áp dụng sau 14:00", "Không áp dụng T7-CN"],
    usage_instructions: ["Đặt bàn trước 30 phút", "Đưa mã voucher khi thanh toán"],
    sale_start_date: daysFrom(now, -25),
    sale_end_date: daysFrom(now, 5),
    validity_days: 12,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -24)
  },
  {
    id: ids.vouchers.pizzaHutHalf,
    partner_id: ids.partners.pizzaHut,
    category_id: ids.categories.anUong,
    name: "Giảm 50% Pizza Hut cỡ lớn",
    description: "Giảm trực tiếp 50% cho pizza size L dòng Classic.",
    thumbnail_url: "https://cdn.asa.test/voucher/pizzahut-50.jpg",
    original_price: 320000,
    selling_price: 160000,
    discount_rate: 50,
    applicable_area: "TP. Hồ Chí Minh, Hà Nội",
    total_quantity: 350,
    remaining_quantity: 210,
    terms_and_conditions: ["Không áp dụng giao hàng", "Mỗi bàn tối đa 2 voucher"],
    usage_instructions: ["Đặt bàn trước", "Xuất trình mã voucher tại quầy"],
    sale_start_date: daysFrom(now, -15),
    sale_end_date: daysFrom(now, 20),
    validity_days: 14,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -14)
  },
  {
    id: ids.vouchers.pizzaHutFamily,
    partner_id: ids.partners.pizzaHut,
    category_id: ids.categories.anUong,
    name: "Combo gia đình Pizza Hut 4 người",
    description: "1 pizza cỡ lớn + 1 mì ý + 4 nước ngọt.",
    thumbnail_url: "https://cdn.asa.test/voucher/pizzahut-family.jpg",
    original_price: 520000,
    selling_price: 399000,
    discount_rate: 23.27,
    applicable_area: "Hà Nội",
    total_quantity: 120,
    remaining_quantity: 75,
    terms_and_conditions: ["Áp dụng tại chi nhánh chỉ định", "Không tách combo"],
    usage_instructions: ["Đặt trước 2 giờ", "Đối soát mã voucher khi thanh toán"],
    sale_start_date: daysFrom(now, -8),
    sale_end_date: daysFrom(now, 12),
    validity_days: 10,
    status: "draft",
    approval_status: "pending"
  },
  {
    id: ids.vouchers.cgvCouple,
    partner_id: ids.partners.cgv,
    category_id: ids.categories.veXemPhim,
    name: "Combo CGV Couple: 2 vé + 1 bắp + 2 nước",
    description: "Áp dụng cho suất chiếu 2D tất cả ngày trong tuần.",
    thumbnail_url: "https://cdn.asa.test/voucher/cgv-couple.jpg",
    original_price: 360000,
    selling_price: 249000,
    discount_rate: 30.83,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 480,
    remaining_quantity: 300,
    terms_and_conditions: ["Không áp dụng phim đặc biệt", "Không áp dụng ngày lễ"],
    usage_instructions: ["Đặt lịch trước trên app", "Đổi mã tại quầy bắp nước"],
    sale_start_date: daysFrom(now, -11),
    sale_end_date: daysFrom(now, 45),
    validity_days: 30,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -10)
  },
  {
    id: ids.vouchers.cgvIMAX,
    partner_id: ids.partners.cgv,
    category_id: ids.categories.veXemPhim,
    name: "Vé IMAX CGV giảm 20%",
    description: "Áp dụng cho các suất chiếu IMAX tại rạp được chỉ định.",
    thumbnail_url: "https://cdn.asa.test/voucher/cgv-imax.jpg",
    original_price: 240000,
    selling_price: 192000,
    discount_rate: 20,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 200,
    remaining_quantity: 0,
    terms_and_conditions: ["Chỉ áp dụng IMAX", "Không đổi trả"],
    usage_instructions: ["Đổi mã trước giờ chiếu 15 phút", "Mang CCCD khi nhận vé"],
    sale_start_date: daysFrom(now, -90),
    sale_end_date: daysFrom(now, -20),
    validity_days: 7,
    status: "expired",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -89)
  },
  {
    id: ids.vouchers.gogiBuffet,
    partner_id: ids.partners.gogi,
    category_id: ids.categories.buffet,
    name: "Buffet Gogi House cuối tuần",
    description: "Buffet nướng không giới hạn cho 1 khách.",
    thumbnail_url: "https://cdn.asa.test/voucher/gogi-buffet.jpg",
    original_price: 429000,
    selling_price: 319000,
    discount_rate: 25.64,
    applicable_area: "Đà Nẵng",
    total_quantity: 250,
    remaining_quantity: 190,
    terms_and_conditions: ["Áp dụng thứ 6 đến CN", "Phụ thu trẻ em theo quy định"],
    usage_instructions: ["Đặt bàn trước 24 giờ", "Xuất trình voucher tại lễ tân"],
    sale_start_date: daysFrom(now, -2),
    sale_end_date: daysFrom(now, 60),
    validity_days: 20,
    status: "draft",
    approval_status: "pending"
  },
  {
    id: ids.vouchers.gogiSet2Nguoi,
    partner_id: ids.partners.gogi,
    category_id: ids.categories.anUong,
    name: "Set nướng Gogi House 2 người",
    description: "Set bò Mỹ và panchan không giới hạn.",
    thumbnail_url: "https://cdn.asa.test/voucher/gogi-set-2.jpg",
    original_price: 560000,
    selling_price: 439000,
    discount_rate: 21.61,
    applicable_area: "Đà Nẵng",
    total_quantity: 160,
    remaining_quantity: 130,
    terms_and_conditions: ["Không áp dụng ngày lễ", "Không cộng dồn voucher"],
    usage_instructions: ["Đặt bàn trước", "Đối soát mã tại quầy thu ngân"],
    sale_start_date: daysFrom(now, -5),
    sale_end_date: daysFrom(now, 50),
    validity_days: 20,
    status: "draft",
    approval_status: "rejected"
  },
  {
    id: ids.vouchers.vinpearlStay2N1D,
    partner_id: ids.partners.vinpearl,
    category_id: ids.categories.khachSanResort,
    name: "Nghỉ dưỡng Vinpearl 2 ngày 1 đêm",
    description: "Bao gồm buffet sáng và vé vui chơi VinWonders.",
    thumbnail_url: "https://cdn.asa.test/voucher/vinpearl-2n1d.jpg",
    original_price: 3900000,
    selling_price: 2890000,
    discount_rate: 25.9,
    applicable_area: "Nha Trang",
    total_quantity: 120,
    remaining_quantity: 100,
    terms_and_conditions: ["Đặt trước 7 ngày", "Phụ thu cuối tuần"],
    usage_instructions: ["Liên hệ hotline để đặt chỗ", "Cung cấp mã voucher"],
    sale_start_date: daysFrom(now, -30),
    sale_end_date: daysFrom(now, 120),
    validity_days: 60,
    status: "draft",
    approval_status: "rejected"
  },
  {
    id: ids.vouchers.vinpearlSpa,
    partner_id: ids.partners.vinpearl,
    category_id: ids.categories.spaMassage,
    name: "Gói Spa thư giãn Vinpearl 90 phút",
    description: "Massage đá nóng và chăm sóc da mặt cơ bản.",
    thumbnail_url: "https://cdn.asa.test/voucher/vinpearl-spa.jpg",
    original_price: 1400000,
    selling_price: 990000,
    discount_rate: 29.29,
    applicable_area: "Nha Trang",
    total_quantity: 80,
    remaining_quantity: 60,
    terms_and_conditions: ["Hẹn lịch trước 48 giờ", "Không áp dụng dịp lễ"],
    usage_instructions: ["Mang theo CCCD khi check-in", "Đối chiếu mã tại quầy spa"],
    sale_start_date: daysFrom(now, -18),
    sale_end_date: daysFrom(now, 90),
    validity_days: 45,
    status: "draft",
    approval_status: "pending"
  },
  {
    id: ids.vouchers.karaokeKatinat,
    partner_id: ids.partners.highlands,
    category_id: ids.categories.karaoke,
    name: "Combo karaoke cuối tuần 3 giờ",
    description: "Phòng tiêu chuẩn 6 người, tặng 1 phần snack.",
    thumbnail_url: "https://cdn.asa.test/voucher/karaoke-weekend.jpg",
    original_price: 650000,
    selling_price: 429000,
    discount_rate: 34,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 100,
    remaining_quantity: 75,
    terms_and_conditions: ["Chỉ áp dụng từ 18:00-22:00", "Không áp dụng lễ"],
    usage_instructions: ["Đặt phòng qua hotline", "Xác nhận mã tại quầy"],
    sale_start_date: daysFrom(now, -7),
    sale_end_date: daysFrom(now, 30),
    validity_days: 15,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -6)
  },
  {
    id: ids.vouchers.lotteCinema,
    partner_id: ids.partners.cgv,
    category_id: ids.categories.veXemPhim,
    name: "Combo vé phim cuối tuần giảm sâu",
    description: "2 vé 2D và 1 bắp caramel cỡ lớn.",
    thumbnail_url: "https://cdn.asa.test/voucher/cinema-weekend.jpg",
    original_price: 330000,
    selling_price: 229000,
    discount_rate: 30.61,
    applicable_area: "Hà Nội, TP. Hồ Chí Minh",
    total_quantity: 260,
    remaining_quantity: 175,
    terms_and_conditions: ["Không áp dụng suất chiếu sau 22:00", "Không hoàn tiền"],
    usage_instructions: ["Đổi mã trước giờ chiếu", "Xuất trình tại quầy"],
    sale_start_date: daysFrom(now, -10),
    sale_end_date: daysFrom(now, 50),
    validity_days: 25,
    status: "active",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -9)
  },
  {
    id: ids.vouchers.texasChicken,
    partner_id: ids.partners.pizzaHut,
    category_id: ids.categories.anUong,
    name: "Combo Texas Chicken 4 người",
    description: "8 miếng gà, 2 khoai lớn và 4 nước ngọt.",
    thumbnail_url: "https://cdn.asa.test/voucher/texas-family.jpg",
    original_price: 460000,
    selling_price: 329000,
    discount_rate: 28.48,
    applicable_area: "TP. Hồ Chí Minh",
    total_quantity: 180,
    remaining_quantity: 90,
    terms_and_conditions: ["Áp dụng tại chi nhánh tham gia", "Không áp dụng delivery"],
    usage_instructions: ["Đến quầy và đọc mã", "Nhân viên xác nhận qua QR"],
    sale_start_date: daysFrom(now, -14),
    sale_end_date: daysFrom(now, 15),
    validity_days: 10,
    status: "paused",
    approval_status: "approved",
    approved_by: ids.users.adminContent,
    approved_at: daysFrom(now, -13)
  },
  {
    id: ids.vouchers.boToQuanMoc,
    partner_id: ids.partners.gogi,
    category_id: ids.categories.anUong,
    name: "Lẩu bò tơ Quán Mộc cho nhóm 4 người",
    description: "Set lẩu bò tơ, rau và đồ nhúng đầy đủ.",
    thumbnail_url: "https://cdn.asa.test/voucher/bo-to-quan-moc.jpg",
    original_price: 780000,
    selling_price: 539000,
    discount_rate: 30.9,
    applicable_area: "Hà Nội",
    total_quantity: 100,
    remaining_quantity: 95,
    terms_and_conditions: ["Áp dụng sau 17:00", "Không dùng chung ưu đãi khác"],
    usage_instructions: ["Đặt trước 6 giờ", "Xác nhận tại quầy"],
    sale_start_date: daysFrom(now, 2),
    sale_end_date: daysFrom(now, 45),
    validity_days: 12,
    status: "draft",
    approval_status: "pending"
  },
  {
    id: ids.vouchers.kingBBQ,
    partner_id: ids.partners.gogi,
    category_id: ids.categories.buffet,
    name: "Buffet King BBQ Premium",
    description: "Buffet nướng cao cấp với thịt bò Mỹ nhập khẩu.",
    thumbnail_url: "https://cdn.asa.test/voucher/king-bbq-premium.jpg",
    original_price: 499000,
    selling_price: 369000,
    discount_rate: 26.05,
    applicable_area: "Hà Nội",
    total_quantity: 220,
    remaining_quantity: 180,
    terms_and_conditions: ["Không áp dụng lễ Tết", "Phụ thu cuối tuần"],
    usage_instructions: ["Đặt bàn trước", "Đưa mã voucher tại quầy"],
    sale_start_date: daysFrom(now, -3),
    sale_end_date: daysFrom(now, 40),
    validity_days: 15,
    status: "draft",
    approval_status: "pending"
  }
];

const staffAssignments: Array<{ userId: string; branchId: string }> = [
  { userId: ids.users.voucherStaffHighlands, branchId: ids.branches.highlandsQ1 },
  { userId: ids.users.voucherStaffPhucLong, branchId: ids.branches.phucLongQ3 },
  { userId: ids.users.voucherStaffPizzaHut, branchId: ids.branches.pizzaHutBaTrieu },
  { userId: ids.users.voucherStaffCGV, branchId: ids.branches.cgvVincom },
  { userId: ids.users.voucherStaffGogi, branchId: ids.branches.gogiDN },
  { userId: ids.users.voucherStaffVinpearl, branchId: ids.branches.vinpearlNT },
  { userId: ids.users.storeStaffHighlandsQ1, branchId: ids.branches.highlandsQ1 },
  { userId: ids.users.storeStaffHighlandsTDB, branchId: ids.branches.highlandsTDB },
  { userId: ids.users.storeStaffPhucLongQ3, branchId: ids.branches.phucLongQ3 },
  { userId: ids.users.storeStaffPizzaHutPMH, branchId: ids.branches.pizzaHutPMH },
  { userId: ids.users.storeStaffCGVVincom, branchId: ids.branches.cgvVincom },
  { userId: ids.users.storeStaffCGVAeon, branchId: ids.branches.cgvAeon },
  { userId: ids.users.storeStaffGogiDN, branchId: ids.branches.gogiDN },
  { userId: ids.users.storeStaffVinpearlNT, branchId: ids.branches.vinpearlNT }
];

const voucherBranchMap: Array<{ id: string; voucherId: string; branchId: string }> = [
  { id: "54000000-0000-0000-0000-000000000001", voucherId: ids.vouchers.highlandsBogo, branchId: ids.branches.highlandsQ1 },
  { id: "54000000-0000-0000-0000-000000000002", voucherId: ids.vouchers.highlandsBogo, branchId: ids.branches.highlandsTDB },
  { id: "54000000-0000-0000-0000-000000000003", voucherId: ids.vouchers.highlandsCombo, branchId: ids.branches.highlandsLandmark81 },
  { id: "54000000-0000-0000-0000-000000000004", voucherId: ids.vouchers.phucLongSizeL, branchId: ids.branches.phucLongQ3 },
  { id: "54000000-0000-0000-0000-000000000005", voucherId: ids.vouchers.phucLongTeaSet, branchId: ids.branches.phucLongGoVap },
  { id: "54000000-0000-0000-0000-000000000006", voucherId: ids.vouchers.pizzaHutHalf, branchId: ids.branches.pizzaHutBaTrieu },
  { id: "54000000-0000-0000-0000-000000000007", voucherId: ids.vouchers.cgvCouple, branchId: ids.branches.cgvVincom },
  { id: "54000000-0000-0000-0000-000000000008", voucherId: ids.vouchers.cgvCouple, branchId: ids.branches.cgvAeon },
  { id: "54000000-0000-0000-0000-000000000009", voucherId: ids.vouchers.cgvIMAX, branchId: ids.branches.cgvAeon },
  { id: "54000000-0000-0000-0000-000000000010", voucherId: ids.vouchers.karaokeKatinat, branchId: ids.branches.highlandsQ1 },
  { id: "54000000-0000-0000-0000-000000000011", voucherId: ids.vouchers.lotteCinema, branchId: ids.branches.cgvVincom },
  { id: "54000000-0000-0000-0000-000000000012", voucherId: ids.vouchers.texasChicken, branchId: ids.branches.pizzaHutPMH }
];

export async function seedCatalog({ prisma }: SeedContext) {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      create: category,
      update: category
    });
  }

  for (const partner of partners) {
    await prisma.partner.upsert({
      where: { id: partner.id },
      create: {
        ...partner,
        created_at: daysFrom(now, -140),
        updated_at: daysFrom(now, -2)
      },
      update: {
        representative_user_id: partner.representative_user_id,
        business_name: partner.business_name,
        business_code: partner.business_code,
        business_type: partner.business_type,
        tax_number: partner.tax_number,
        logo_url: partner.logo_url,
        website_url: partner.website_url,
        description: partner.description,
        approval_status: partner.approval_status,
        status: partner.status,
        approved_by: partner.approved_by ?? null,
        approved_at: partner.approved_at ?? null,
        updated_at: daysFrom(now, -2)
      }
    });
  }

  for (const branch of branches) {
    await prisma.partnerBranch.upsert({
      where: { id: branch.id },
      create: {
        ...branch,
        created_at: daysFrom(now, -100)
      },
      update: {
        partner_id: branch.partner_id,
        branch_name: branch.branch_name,
        address: branch.address,
        city: branch.city,
        district: branch.district,
        phone: branch.phone,
        latitude: branch.latitude,
        longitude: branch.longitude,
        is_active: branch.is_active
      }
    });
  }

  for (const assignment of staffAssignments) {
    await prisma.user.update({
      where: { id: assignment.userId },
      data: { partner_branches_id: assignment.branchId }
    });
  }

  for (const voucher of vouchers) {
    await prisma.voucherProduct.upsert({
      where: { id: voucher.id },
      create: {
        ...voucher,
        original_price: money(voucher.original_price),
        selling_price: money(voucher.selling_price),
        created_at: daysFrom(now, -80),
        updated_at: daysFrom(now, -1)
      },
      update: {
        partner_id: voucher.partner_id,
        category_id: voucher.category_id,
        name: voucher.name,
        description: voucher.description,
        thumbnail_url: voucher.thumbnail_url,
        original_price: money(voucher.original_price),
        selling_price: money(voucher.selling_price),
        discount_rate: voucher.discount_rate,
        applicable_area: voucher.applicable_area,
        total_quantity: voucher.total_quantity,
        remaining_quantity: voucher.remaining_quantity,
        terms_and_conditions: voucher.terms_and_conditions,
        usage_instructions: voucher.usage_instructions,
        sale_start_date: voucher.sale_start_date,
        sale_end_date: voucher.sale_end_date,
        validity_days: voucher.validity_days,
        status: voucher.status,
        approval_status: voucher.approval_status,
        approved_by: voucher.approved_by ?? null,
        approved_at: voucher.approved_at ?? null,
        updated_at: daysFrom(now, -1)
      }
    });

    await prisma.voucherProductImage.upsert({
      where: { id: `55000000-0000-0000-0000-${voucher.id.slice(-12)}` },
      create: {
        id: `55000000-0000-0000-0000-${voucher.id.slice(-12)}`,
        voucher_product_id: voucher.id,
        image_url: voucher.thumbnail_url,
        is_primary: true,
        sort_order: 0
      },
      update: {
        voucher_product_id: voucher.id,
        image_url: voucher.thumbnail_url,
        is_primary: true,
        sort_order: 0
      }
    });
  }

  for (const mapping of voucherBranchMap) {
    await prisma.voucherProductBranch.upsert({
      where: { id: mapping.id },
      create: {
        id: mapping.id,
        voucher_product_id: mapping.voucherId,
        branch_id: mapping.branchId
      },
      update: {
        voucher_product_id: mapping.voucherId,
        branch_id: mapping.branchId
      }
    });
  }
}
