// Business location data — each entry is one branch with its owning partner and region.
// Used by VoucherListPage to power cascading Business → Region → Branch filters.

export interface BusinessLocation {
  partnerId: string
  partnerName: string
  region: string     // province / city displayed in the Region dropdown
  branchId: string
  branchName: string // short label shown in the Branch dropdown
  address: string    // full street address
}

export const BUSINESS_LOCATIONS: BusinessLocation[] = [
  // ─── Pizza Hut Vietnam (p1) ──────────────────────────────────────────────
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hồ Chí Minh", branchId: "p1-hcm-1", branchName: "Quận 1",       address: "23 Lê Lợi, Q.1, TP.HCM" },
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hồ Chí Minh", branchId: "p1-hcm-2", branchName: "Quận 3",       address: "45 Nguyễn Đình Chiểu, Q.3, TP.HCM" },
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hồ Chí Minh", branchId: "p1-hcm-3", branchName: "Phú Nhuận",    address: "12 Phan Xích Long, Phú Nhuận, TP.HCM" },
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hồ Chí Minh", branchId: "p1-hcm-4", branchName: "Bình Thạnh",   address: "67 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM" },
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hà Nội",      branchId: "p1-hn-1",  branchName: "Hoàn Kiếm",    address: "89 Hàng Bài, Hoàn Kiếm, Hà Nội" },
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hà Nội",      branchId: "p1-hn-2",  branchName: "Đống Đa",      address: "34 Xã Đàn, Đống Đa, Hà Nội" },
  { partnerId: "p1", partnerName: "Pizza Hut Vietnam", region: "Hà Nội",      branchId: "p1-hn-3",  branchName: "Cầu Giấy",     address: "101 Cầu Giấy, Cầu Giấy, Hà Nội" },

  // ─── CGV Cinemas (p3) ────────────────────────────────────────────────────
  { partnerId: "p3", partnerName: "CGV Cinemas", region: "Hồ Chí Minh", branchId: "p3-hcm-1", branchName: "Quận 1 – Vincom",   address: "Vincom Center, 72 Lê Thánh Tôn, Q.1, TP.HCM" },
  { partnerId: "p3", partnerName: "CGV Cinemas", region: "Hồ Chí Minh", branchId: "p3-hcm-2", branchName: "Quận 7 – SC VivoCity", address: "SC VivoCity, 1058 Nguyễn Văn Linh, Q.7, TP.HCM" },
  { partnerId: "p3", partnerName: "CGV Cinemas", region: "Hồ Chí Minh", branchId: "p3-hcm-3", branchName: "Thủ Đức – Aeon",    address: "Aeon Mall Bình Dương, Thủ Đức, TP.HCM" },
  { partnerId: "p3", partnerName: "CGV Cinemas", region: "Hà Nội",      branchId: "p3-hn-1",  branchName: "Cầu Giấy – Vincom", address: "Vincom Phạm Văn Đồng, Cầu Giấy, Hà Nội" },
  { partnerId: "p3", partnerName: "CGV Cinemas", region: "Hà Nội",      branchId: "p3-hn-2",  branchName: "Hoàng Mai – Aeon",  address: "Aeon Mall Hà Đông, Hoàng Mai, Hà Nội" },
  { partnerId: "p3", partnerName: "CGV Cinemas", region: "Đà Nẵng",     branchId: "p3-dn-1",  branchName: "Hải Châu – Vincom", address: "Vincom Plaza Đà Nẵng, Hải Châu, Đà Nẵng" },

  // ─── Calla Spa & Beauty (p4) — Hà Nội only ───────────────────────────────
  { partnerId: "p4", partnerName: "Calla Spa & Beauty", region: "Hà Nội", branchId: "p4-hn-1", branchName: "Ba Đình",    address: "45 Ngọc Hà, Ba Đình, Hà Nội" },
  { partnerId: "p4", partnerName: "Calla Spa & Beauty", region: "Hà Nội", branchId: "p4-hn-2", branchName: "Hoàn Kiếm", address: "22 Hàng Trống, Hoàn Kiếm, Hà Nội" },
  { partnerId: "p4", partnerName: "Calla Spa & Beauty", region: "Hà Nội", branchId: "p4-hn-3", branchName: "Tây Hồ",    address: "18 Xuân Diệu, Tây Hồ, Hà Nội" },

  // ─── Vietjet Air (p2) — ticket offices at airports ───────────────────────
  { partnerId: "p2", partnerName: "Vietjet Air", region: "Hồ Chí Minh", branchId: "p2-hcm-1", branchName: "Sân bay Tân Sơn Nhất", address: "Sân bay Tân Sơn Nhất, Tân Bình, TP.HCM" },
  { partnerId: "p2", partnerName: "Vietjet Air", region: "Hà Nội",      branchId: "p2-hn-1",  branchName: "Sân bay Nội Bài",      address: "Sân bay Quốc tế Nội Bài, Sóc Sơn, Hà Nội" },
  { partnerId: "p2", partnerName: "Vietjet Air", region: "Đà Nẵng",     branchId: "p2-dn-1",  branchName: "Sân bay Đà Nẵng",      address: "Sân bay Đà Nẵng, Hải Châu, Đà Nẵng" },
  { partnerId: "p2", partnerName: "Vietjet Air", region: "Cần Thơ",     branchId: "p2-ct-1",  branchName: "Sân bay Cần Thơ",      address: "Sân bay Quốc tế Cần Thơ, Cần Thơ" },

  // ─── Vinpearl Resort (p5) — resort destinations ───────────────────────────
  { partnerId: "p5", partnerName: "Vinpearl Resort", region: "Khánh Hòa",  branchId: "p5-nt-1", branchName: "Vinpearl Nha Trang Bay",       address: "Đảo Hòn Tre, Vĩnh Nguyên, Nha Trang, Khánh Hòa" },
  { partnerId: "p5", partnerName: "Vinpearl Resort", region: "Khánh Hòa",  branchId: "p5-nt-2", branchName: "Vinpearl Nha Trang Resort",     address: "Đường Trần Phú, Lộc Thọ, Nha Trang, Khánh Hòa" },
  { partnerId: "p5", partnerName: "Vinpearl Resort", region: "Kiên Giang", branchId: "p5-pq-1", branchName: "Vinpearl Phú Quốc Resort",      address: "Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang" },
  { partnerId: "p5", partnerName: "Vinpearl Resort", region: "Kiên Giang", branchId: "p5-pq-2", branchName: "Vinpearl Discovery Phú Quốc",   address: "Cửa Lấp, Dương Tơ, Phú Quốc, Kiên Giang" },
  { partnerId: "p5", partnerName: "Vinpearl Resort", region: "Quảng Ninh", branchId: "p5-hl-1", branchName: "Vinpearl Hạ Long",              address: "Đảo Rều, Hạ Long, Quảng Ninh" },
]

// Derive the sorted list of unique businesses that have location data
export const LOCATABLE_PARTNERS = Array.from(
  new Map(BUSINESS_LOCATIONS.map((l) => [l.partnerId, { id: l.partnerId, name: l.partnerName }])).values()
).sort((a, b) => a.name.localeCompare(b.name))
