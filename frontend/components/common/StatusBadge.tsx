import { STATUS_LABEL, statusColor } from "@/lib/constants";

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const { bg, text } = statusColor(status);
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
