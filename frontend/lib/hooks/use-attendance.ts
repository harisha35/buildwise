import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { attendanceApi } from "@/lib/api/attendance";
import type { AttendanceEntryInput } from "@/lib/api/types";

export function useAttendance(params: { project_id?: number; start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: () => attendanceApi.list(params),
    enabled: params.project_id !== undefined,
  });
}

export function useBulkUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { project_id: number; date: string; entries: AttendanceEntryInput[] }) =>
      attendanceApi.bulkUpsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
