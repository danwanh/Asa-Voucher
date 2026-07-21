import { supabase } from "../config/supabase.js";
import type { ComplaintResponderRole, ComplaintResponseRow } from "../types/complaint.types.js";

export async function listResponsesByComplaint(complaintId: string): Promise<ComplaintResponseRow[]> {
  const { data, error } = await supabase
    .from("complaint_responses")
    .select("*")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ComplaintResponseRow[];
}

export async function createComplaintResponse(
  complaintId: string,
  respondedBy: string,
  responderRole: ComplaintResponderRole,
  content: string,
): Promise<ComplaintResponseRow> {
  const { data, error } = await supabase
    .from("complaint_responses")
    .insert({
      complaint_id: complaintId,
      responded_by: respondedBy,
      responder_role: responderRole,
      content,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ComplaintResponseRow;
}
