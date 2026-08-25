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
    prisma.cmsContent.findMany({
      where,
      orderBy: filter.content_type === "banner" || filter.content_type === "popup"
        ? [{ sort_order: "asc" }, { created_at: "desc" }]
        : [{ created_at: "desc" }],
      skip,
      take: filter.limit,
    }),
    prisma.cmsContent.count({ where }),
  ]);
  return { rows, total };
}

export async function findCmsContentById(id: string) {
  return prisma.cmsContent.findUnique({ where: { id } });
}

export async function listActiveCmsContentsByType(contentType: string) {
  return prisma.cmsContent.findMany({
    where: { content_type: contentType, status: "active" },
    orderBy: contentType === "banner" || contentType === "popup"
      ? [{ sort_order: "asc" }, { created_at: "desc" }]
      : [{ created_at: "desc" }],
  });
}

export async function createCmsContent(data: {
  content_type: string; title: string; content?: string | null;
  image_url?: string | null;
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

export async function deleteCmsContent(id: string) {
  return prisma.cmsContent.delete({ where: { id } });
}
