import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectTypesApi, projectsApi } from "@/lib/api/projects";
import type { ProjectCreate, ProjectUpdate } from "@/lib/api/types";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
}

export function useProject(id: number) {
  return useQuery({ queryKey: ["projects", id], queryFn: () => projectsApi.get(id), enabled: Number.isFinite(id) });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectCreate) => projectsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectUpdate) => projectsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", id] });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => projectsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useAssignSupervisor(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => projectsApi.assignSupervisor(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", projectId] }),
  });
}

export function useProjectTypes() {
  return useQuery({ queryKey: ["project-types"], queryFn: projectTypesApi.list });
}

export function useCreateProjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => projectTypesApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-types"] }),
  });
}
