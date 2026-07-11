export type AuditAction = "admin_action" | "voucher_validation" | "status_change";

export async function writeAuditLog(action: AuditAction, metadata: Record<string, unknown>) {
  // TODO: persist to audit_logs repository after database migrations are added.
  return { action, metadata, occurredAt: new Date().toISOString() };
}
