import { adminRoles, type UserRole } from "../types/auth.types.js";
import { prisma } from "../config/prisma.js";
import { requireData, throwDbError } from "../utils/db.js";
import https from "https";
import { HttpError } from "../utils/http-error.js";
import { rangeFromPagination } from "../validations/common.validation.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string | null; branchId?: string | null };

function isAdminOperations(user: CurrentUser) {
  return user.role === "admin_operations";
}

function isAnyAdmin(user: CurrentUser) {
  return adminRoles.includes(user.role);
}

async function getPartner(id: string) {
  return requireData<Record<string, unknown>>(await prisma.partner.findUnique({ where: { id } }) as unknown as Record<string, unknown> | null, "Partner not found");
}

function assertPartnerOwnerOrAdmin(user: CurrentUser, partner: Record<string, unknown>) {
  if (!isAdminOperations(user) && partner.representative_user_id !== user.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
}

function assertPartnerReadAccess(user: CurrentUser, partner: Record<string, unknown>) {
  if (isAnyAdmin(user) || partner.representative_user_id === user.id || user.partnerId === partner.id) return;
  throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
}

export async function listPartners(queryInput: Record<string, string | number>) {
  const { page, limit, approval_status: approvalStatus, status } = queryInput;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));
  const where: Record<string, unknown> = {};
  if (approvalStatus) where.approval_status = approvalStatus;
  if (status) where.status = status;
  const [items, count] = await prisma.$transaction([
    prisma.partner.findMany({ where, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.partner.count({ where })
  ]);
  return { items, count, page, limit };
}

export async function createPartner(user: CurrentUser, input: Record<string, unknown>) {
  const representativeUserId = isAdminOperations(user) && input.representative_user_id ? input.representative_user_id : user.id;
  try {
    return await prisma.partner.create({ data: { ...input, representative_user_id: representativeUserId, approval_status: "pending", status: "active" } as never });
  } catch (error) {
    throwDbError(error);
  }
}

export async function getPartnerById(user: CurrentUser, id: string) {
  const partner = await getPartner(id);
  assertPartnerOwnerOrAdmin(user, partner);
  return partner;
}

export async function updatePartner(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const partner = await getPartner(id);
  assertPartnerOwnerOrAdmin(user, partner);
  try {
    return await prisma.partner.update({ where: { id }, data: { ...input, updated_at: new Date() } as never });
  } catch (error) {
    throwDbError(error, "Partner not found");
  }
}

export async function deletePartner(id: string) {
  try {
    const activeVoucherCount = await prisma.issuedVoucher.count({
      where: { status: "active", order_items: { voucher_products: { partner_id: id } } },
    });
    if (activeVoucherCount > 0) {
      throw new HttpError(409, "Đối tác còn voucher đang hoạt động, không thể đóng", "PARTNER_HAS_ACTIVE_VOUCHERS");
    }
    await prisma.partner.update({ where: { id }, data: { status: "closed", updated_at: new Date() } });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throwDbError(error, "Partner not found");
  }
}

export async function updatePartnerApproval(adminId: string, id: string, approvalStatus: string) {
  try {
    const updatedPartner = await prisma.partner.update({ where: { id }, data: { approval_status: approvalStatus, approved_by: adminId, approved_at: new Date(), updated_at: new Date() } });
    const representativeUserId = (updatedPartner as { representative_user_id?: string }).representative_user_id;
    if (representativeUserId) {
      await prisma.user.update({ where: { id: representativeUserId }, data: { is_active: approvalStatus === "approved", auth_version: { increment: 1 } } });
    }
    if (approvalStatus === "rejected") {
      await prisma.voucherProduct.updateMany({
        where: { partner_id: id, status: { in: ["active", "paused"] } },
        data: { status: "paused", updated_at: new Date() },
      });
    }
    return updatedPartner;
  } catch (error) {
    throwDbError(error, "Partner not found");
  }
}

export async function updatePartnerStatus(id: string, status: string) {
  try {
    if (status === "closed" || status === "suspended") {
      const activeVoucherCount = await prisma.issuedVoucher.count({
        where: { status: "active", order_items: { voucher_products: { partner_id: id } } },
      });
      if (activeVoucherCount > 0) {
        throw new HttpError(409, "Đối tác còn voucher đang hoạt động, không thể thay đổi trạng thái", "PARTNER_HAS_ACTIVE_VOUCHERS");
      }
    }
    return await prisma.partner.update({ where: { id }, data: { status, updated_at: new Date() } });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throwDbError(error, "Partner not found");
  }
}

export async function listBranches(user: CurrentUser, partnerId: string) {
  const partner = await getPartner(partnerId);
  if (user.role === "partner_store_staff") {
    const branch = user.branchId ? await prisma.partnerBranch.findUnique({ where: { id: user.branchId }, select: { partner_id: true } }) : null;
    if (branch?.partner_id !== partnerId) throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  } else {
    assertPartnerReadAccess(user, partner);
  }

  return prisma.partnerBranch.findMany({ where: { partner_id: partnerId }, orderBy: { created_at: "desc" } });
}

export async function createBranch(
  user: CurrentUser,
  partnerId: string,
  input: Record<string, unknown>
) {
  const partner = await getPartner(partnerId);
  assertPartnerOwnerOrAdmin(user, partner);

  try {
    const address = String(input.address);
    const city = String(input.city);
    const locality = input.ward
      ? String(input.ward)
      : input.district
        ? String(input.district)
      : undefined;

    const existingBranch = await prisma.partnerBranch.findFirst({
      where: {
        partner_id: partnerId,
        branch_name: {
          equals: String(input.branch_name).trim(),
          mode: "insensitive",
        },
      },
    });

    if (existingBranch) {
      throw new HttpError(
        409,
        "Tên chi nhánh đã tồn tại. Vui lòng chọn tên khác.",
        "BRANCH_NAME_EXISTS"
      );
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const coords = await geocodeAddress(address, locality, city);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch {
      // Geocoding failed — create branch without coordinates
    }

    return await prisma.partnerBranch.create({
      data: {
        ...input,
        latitude,
        longitude,
        partner_id: partnerId,
      } as never,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throwDbError(error);
  }
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function geocodeAddress(
  address: string,
  district: string | undefined,
  city: string,
): Promise<{ latitude: number; longitude: number }> {
  const dns = await import("dns");
  const resolver = new dns.Resolver();
  resolver.setServers(["8.8.8.8", "8.8.4.4"]);

  const hostname = "nominatim.openstreetmap.org";

  const addrs = await new Promise<string[]>((resolve, reject) => {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses?.length) return reject(err ?? new Error("DNS lookup failed"));
      resolve(addresses);
    });
  });

  const fullAddress = [address, district, city]
    .filter(Boolean)
    .join(", ");

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", fullAddress);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "vn");

  const results = await new Promise<Array<{
    lat: string;
    lon: string;
    display_name?: string;
    type?: string;
    address?: {
      house_number?: string;
      road?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
    };
  }>>((resolve, reject) => {
    const req = https.get(
      {
        hostname: addrs[0],
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: { "User-Agent": "Asa-Voucher/1.0", Host: hostname },
        servername: hostname,
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(new HttpError(502, "Không thể xác định địa chỉ", "GEOCODING_FAILED"));
          }
          try { resolve(JSON.parse(data) as Array<any>); }
          catch { reject(new HttpError(502, "Không thể xác định địa chỉ", "GEOCODING_FAILED")); }
        });
      }
    );
    req.on("error", () => reject(new HttpError(502, "Không thể xác định địa chỉ", "GEOCODING_FAILED")));
    req.setTimeout(10000, () => { req.destroy(); reject(new HttpError(504, "Geocoding timeout", "GEOCODING_TIMEOUT")); });
  });

  if (results.length === 0) {
    throw new HttpError(
      400,
      "Địa chỉ không tồn tại hoặc không tìm thấy. Vui lòng kiểm tra lại.",
      "ADDRESS_NOT_FOUND",
    );
  }

  const validResult = results.find((result) => {
    if (!result.address?.road) return false;

    const resultCity = normalize(
      result.address.city ||
        result.address.town ||
        result.address.village ||
        result.address.state ||
        "",
    );
    const inputCity = normalize(city);

    return (
      resultCity.length > 0 &&
      (resultCity.includes(inputCity) || inputCity.includes(resultCity))
    );
  });

  if (!validResult) {
    throw new HttpError(
      400,
      "Địa chỉ không tồn tại hoặc không đủ cụ thể. Vui lòng nhập địa chỉ chính xác.",
      "INVALID_ADDRESS",
    );
  }

  const latitude = Number(validResult.lat);
  const longitude = Number(validResult.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(
      400,
      "Không thể xác định tọa độ từ địa chỉ này.",
      "INVALID_COORDINATES",
    );
  }

  return {
    latitude,
    longitude,
  };
}

async function getBranch(id: string) {
  return requireData<Record<string, unknown>>(await prisma.partnerBranch.findUnique({ where: { id }, include: { partners: true } }) as unknown as Record<string, unknown> | null, "Branch not found");
}

async function assertBranchCanDeactivate(id: string) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const activeVoucherCount = await prisma.voucherProductBranch.count({
    where: {
      branch_id: id,
      voucher_products: {
        approval_status: "approved",
        status: "active",
        sale_start_date: { lte: today },
        sale_end_date: { gte: today },
        remaining_quantity: { gt: 0 }
      }
    }
  });

  if (activeVoucherCount > 0) {
    throw new HttpError(
      409,
      "Chi nhánh đang được áp dụng cho voucher đang hoạt động, không thể ngưng hoạt động.",
      "BRANCH_HAS_ACTIVE_VOUCHERS",
      { activeVoucherCount }
    );
  }
}

export async function getBranchById(user: CurrentUser, id: string) {
  const branch = await getBranch(id);
  if (user.role === "partner_store_staff" && user.branchId !== id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
  if (user.role !== "partner_store_staff") {
    assertPartnerReadAccess(user, branch.partners as Record<string, unknown>);
  }
  return branch;
}

export async function updateBranch(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const branch = await getBranch(id);
  assertPartnerOwnerOrAdmin(user, branch.partners as Record<string, unknown>);
  if (input.is_active === false && branch.is_active !== false) {
    await assertBranchCanDeactivate(id);
  }
  try {
    return await prisma.partnerBranch.update({ where: { id }, data: input as never });
  } catch (error) {
    throwDbError(error, "Branch not found");
  }
}

export async function deleteBranch(user: CurrentUser, id: string) {
  const branch = await getBranch(id);
  assertPartnerOwnerOrAdmin(user, branch.partners as Record<string, unknown>);
  if (branch.is_active !== false) {
    await assertBranchCanDeactivate(id);
  }
  try {
    await prisma.partnerBranch.update({ where: { id }, data: { is_active: false } });
  } catch (error) {
    throwDbError(error, "Branch not found");
  }
}
