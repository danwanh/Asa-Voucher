import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { createCloudinarySignature } from "../utils/cloudinary.js";
import * as cmsContentRepo from "../repositories/cms-content.repository.js"
import { ListCmsContentQuery, CreateCmsContentInput,  UpdateCmsContentInput} from "../validations/cms-content.validation.js";
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
    // 1. Create content
    const content = await tx.cmsContent.create({
      data: { ...input, created_by: user.id }
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