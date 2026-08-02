"use client";

import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/context";
import { useAttendanceAuditLog } from "@/lib/hooks/use-attendance";

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  ot_hours: "OT hours",
  applicable_rate: "Daily rate",
  ot_rate: "OT rate",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  half_day: "Half-day",
  absent: "Absent",
};

function formatValue(fieldName: string, value: string | null): string {
  if (value === null) return "—";
  if (fieldName === "status") return STATUS_LABEL[value] ?? value;
  return value;
}

interface AttendanceHistoryModalProps {
  attendanceId: number | null;
  workerName: string;
  onClose: () => void;
}

export function AttendanceHistoryModal({ attendanceId, workerName, onClose }: AttendanceHistoryModalProps) {
  const { user } = useAuth();
  const { data: entries, isLoading } = useAttendanceAuditLog(attendanceId);

  return (
    <Modal open={attendanceId !== null} onClose={onClose} title={`Edit history — ${workerName}`} width="sm">
      {isLoading && <PageSpinner />}

      {!isLoading && (entries === undefined || entries.length === 0) && (
        <p className="text-sm text-ink-soft">No edits recorded for this entry yet.</p>
      )}

      {!isLoading && entries && entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-field border border-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-xs text-ink-faint">
                <span>{new Date(entry.changed_at).toLocaleString()}</span>
                <span>{entry.changed_by === user?.id ? "You" : entry.changed_by ? `User #${entry.changed_by}` : "System"}</span>
              </div>
              <p className="mt-1 text-sm text-ink">
                <span className="font-semibold">{FIELD_LABEL[entry.field_name] ?? entry.field_name}</span>{" "}
                changed from <span className="font-semibold">{formatValue(entry.field_name, entry.old_value)}</span>{" "}
                to <span className="font-semibold">{formatValue(entry.field_name, entry.new_value)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
