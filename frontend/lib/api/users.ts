import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { UserCreate, UserOut, UserUpdate } from "@/lib/api/types";

export const usersApi = {
  me: () => apiGet<UserOut>("/users/me"),
  list: () => apiGet<UserOut[]>("/users"),
  create: (payload: UserCreate) => apiPost<UserOut>("/users", payload),
  update: (id: number, payload: UserUpdate) => apiPatch<UserOut>(`/users/${id}`, payload),
  deactivate: (id: number) => apiPost<UserOut>(`/users/${id}/deactivate`),
};
