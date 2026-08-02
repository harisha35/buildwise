import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { ProjectCreate, ProjectOut, ProjectTypeOut, ProjectUpdate } from "@/lib/api/types";

export const projectsApi = {
  list: () => apiGet<ProjectOut[]>("/projects"),
  get: (id: number) => apiGet<ProjectOut>(`/projects/${id}`),
  create: (payload: ProjectCreate) => apiPost<ProjectOut>("/projects", payload),
  update: (id: number, payload: ProjectUpdate) => apiPatch<ProjectOut>(`/projects/${id}`, payload),
  archive: (id: number) => apiPost<ProjectOut>(`/projects/${id}/archive`),
  assignSupervisor: (id: number, userId: number) =>
    apiPost<{ id: number; user_id: number; project_id: number }>(`/projects/${id}/assign-supervisor`, {
      user_id: userId,
    }),
};

export const projectTypesApi = {
  list: () => apiGet<ProjectTypeOut[]>("/project-types"),
  create: (name: string) => apiPost<ProjectTypeOut>("/project-types", { name }),
};
