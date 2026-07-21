import { prisma } from "../config/prisma.js";
import type { ComplaintResponderRole, ComplaintResponseRow } from "../types/complaint.types.js";

export async function listResponsesByComplaint(complaintId: string): Promise<ComplaintResponseRow[]> {
  return prisma.complaintResponse.findMany({
    where: { complaint_id: complaintId },
    orderBy: { created_at: "asc" },
  }) as Promise<ComplaintResponseRow[]>;
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
  }) as Promise<ComplaintResponseRow>;
}
