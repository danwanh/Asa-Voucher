import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { createCloudinarySignature } from "../utils/cloudinary.js";
import * as cmsContentRepo from "../repositories/cms-content.repository.js"
import { ListCmsContentQuery, CreateCmsContentInput, UpdateCmsContentInput, MoveCmsBannerInput } from "../validations/cms-content.validation.js";
import { AuthUser } from "../types/auth.types.js";

export async function listCmsContents(query: ListCmsContentQuery) {
  return cmsContentRepo.listCmsContents(query);
}

export async function listPublicCmsContents(contentType: string) {
  return cmsContentRepo.listActiveCmsContentsByType(contentType);
}

export async function getPublicCmsContentById(id: string) {
  const content = await cmsContentRepo.findCmsContentById(id);
  if (!content || content.status !== "active") throw new HttpError(404, "Nội dung không tồn tại");
  return content;
}

export function createMediaSignature() {
  return createCloudinarySignature("asa-voucher/cms");
}

export async function createCmsContent(user: AuthUser, input: CreateCmsContentInput) {
  return prisma.$transaction(async (tx) => {
    const sortOrder = input.content_type === "banner" || input.content_type === "popup"
      ? ((await tx.cmsContent.aggregate({
          _max: { sort_order: true },
          where: { content_type: "banner" },
        }))._max.sort_order ?? -1) + 1
      : 0;

    // 1. Create content
    const content = await tx.cmsContent.create({
      data: { ...input, sort_order: sortOrder, created_by: user.id }
    });

    // 2. Audit log (RB-12)
    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        action: "CREATE",
        content_type: input.content_type,
        description: `Created ${input.content_type}: ${input.title}`,
      }
    });

    return content;
  });
}

export async function updateCmsContent(user: AuthUser, id: string, input: UpdateCmsContentInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Check exists
    const existing = await tx.cmsContent.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Nội dung không tồn tại");

    // 2. Update
    const updateData: Record<string, unknown> = { ...input };
    const content = await tx.cmsContent.update({ where: { id }, data: updateData });

    // 3. Audit log
    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        action: "UPDATE",
        content_type: existing.content_type,
        description: `Updated ${existing.content_type}: ${content.title}`,
      }
    });

    return content;
  });
}

export async function toggleCmsContentStatus(user: AuthUser, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cmsContent.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Nội dung không tồn tại");

    const newStatus = existing.status === "active" ? "hidden" : "active";
    const content = await tx.cmsContent.update({ where: { id }, data: { status: newStatus, updated_at: new Date() } });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        action: "TOGGLE_STATUS",
        content_type: existing.content_type,
        description: `Toggled ${existing.content_type} "${content.title}" → ${newStatus}`,
      }
    });

    return content;
  });
}

export async function deleteCmsContent(user: AuthUser, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cmsContent.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Nội dung không tồn tại");

    await tx.cmsContent.delete({ where: { id } });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        action: "DELETE",
        content_type: existing.content_type,
        description: `Deleted ${existing.content_type}: ${existing.title}`,
      }
    });
  });
}

export async function moveCmsBanner(user: AuthUser, id: string, input: MoveCmsBannerInput) {
  return prisma.$transaction(async (tx) => {
    const currentContent = await tx.cmsContent.findUnique({
      where: { id },
      select: { id: true, content_type: true },
    });
    if (!currentContent || !["banner", "popup"].includes(currentContent.content_type)) {
      throw new HttpError(404, "Banner hoặc popup không tồn tại");
    }

    const contents = await tx.cmsContent.findMany({
      where: { content_type: currentContent.content_type },
      select: { id: true, sort_order: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });

    const currentIndex = contents.findIndex((content) => content.id === id);
    if (currentIndex < 0) throw new HttpError(404, "Banner hoặc popup không tồn tại");

    const adjacentIndex = input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (adjacentIndex < 0 || adjacentIndex >= contents.length) {
      throw new HttpError(400, "Nội dung đã ở vị trí ngoài cùng");
    }

    // Older popup records all used sort_order = 0. Normalize before swapping
    // so moving them produces a stable order for both old and new records.
    await Promise.all(contents.map((content, index) => (
      content.sort_order === index
        ? Promise.resolve()
        : tx.cmsContent.update({
            where: { id: content.id },
            data: { sort_order: index, updated_at: new Date() },
          })
    )));

    const current = contents[currentIndex];
    const adjacent = contents[adjacentIndex];
    await tx.cmsContent.update({
      where: { id: current.id },
      data: { sort_order: adjacentIndex, updated_at: new Date() },
    });
    await tx.cmsContent.update({
      where: { id: adjacent.id },
      data: { sort_order: currentIndex, updated_at: new Date() },
    });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        action: "MOVE",
        content_type: currentContent.content_type,
        description: `Moved ${currentContent.content_type} ${input.direction}`,
      },
    });

    return { id: current.id, direction: input.direction };
  });
}
