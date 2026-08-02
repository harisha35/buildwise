import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  AttendanceAuditLogOut,
  AttendanceEntryInput,
  AttendanceOut,
  AttendanceUpsertResult,
} from "@/lib/api/types";

export const attendanceApi = {
  list: (params: { project_id?: number; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params.project_id !== undefined) query.set("project_id", String(params.project_id));
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    const qs = query.toString();
    return apiGet<AttendanceOut[]>(`/attendance${qs ? `?${qs}` : ""}`);
  },
  bulkUpsert: (payload: { project_id: number; date: string; entries: AttendanceEntryInput[] }) =>
    apiPost<AttendanceUpsertResult>("/attendance", payload),
  update: (
    id: number,
    payload: { status?: string; ot_hours?: number; applicable_rate?: number; ot_rate?: number }
  ) => apiPatch<AttendanceOut>(`/attendance/${id}`, payload),
  auditLog: (id: number) => apiGet<AttendanceAuditLogOut[]>(`/attendance/${id}/audit-log`),
};
