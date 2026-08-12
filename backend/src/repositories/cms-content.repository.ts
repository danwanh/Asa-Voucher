import { prisma } from "../config/prisma.js";

export async function listCmsContents(filter: {
  content_type?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const where: Record<string, unknown> = {};
  if (filter.content_type) where.content_type = filter.content_type;
  if (filter.status) where.status = filter.status;

  const skip = (filter.page - 1) * filter.limit;
  const [rows, total] = await Promise.all([
    prisma.cmsContent.findMany({ where, orderBy: [{ sort_order: "asc" }, { created_at: "desc" }], skip, take: filter.limit }),
    prisma.cmsContent.count({ where }),
  ]);
  return { rows, total };
}

export async function findCmsContentById(id: string) {
  return prisma.cmsContent.findUnique({ where: { id } });
}

export async function createCmsContent(data: {
  content_type: string; title: string; content?: string | null;
  image_url?: string | null; display_time?: Date | null;
  status: string; sort_order: number; created_by?: string | null;
}) {
  return prisma.cmsContent.create({ data });
}

export async function updateCmsContent(id: string, data: Record<string, unknown>) {
  return prisma.cmsContent.update({ where: { id }, data });
}

export async function toggleCmsContentStatus(id: string, newStatus: string) {
  return prisma.cmsContent.update({ where: { id }, data: { status: newStatus, updated_at: new Date() } });
}

export async function createAdminLog(tx: any, input: {
  admin_id: string;
  action: string;
  description?: string;
  content_type?: string;
}) {
  return tx.adminLog.create({ data: input });
}