import { prisma } from "../config/prisma.js";
import type { ComplaintResponderRole, ComplaintResponseRow } from "../types/complaint.types.js";

export async function listResponsesByComplaint(complaintId: string): Promise<ComplaintResponseRow[]> {
  const rows = await prisma.complaintResponse.findMany({
    where: { complaint_id: complaintId },
    include: { responder: { select: { id: true, full_name: true, email: true } } },
    orderBy: { created_at: "asc" },
  });
  return rows as unknown as ComplaintResponseRow[];
}

export async function createComplaintResponse(
  complaintId: string,
  respondedBy: string,
  responderRole: ComplaintResponderRole,
  content: string,
): Promise<ComplaintResponseRow> {
  return prisma.complaintResponse.create({
    data: {
      complaint_id: complaintId,
      responded_by: respondedBy,
      responder_role: responderRole,
      content,
    },
  }) as unknown as Promise<ComplaintResponseRow>;
}
