import { apiPost } from "@/lib/api/client";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function login(email: string, password: string) {
  return apiPost<TokenResponse>("/auth/login", { email, password }, { skipAuth: true });
}

export function forgotPassword(email: string) {
  return apiPost<void>("/auth/forgot-password", { email }, { skipAuth: true });
}

export function resetPassword(token: string, newPassword: string) {
  return apiPost<void>("/auth/reset-password", { token, new_password: newPassword }, { skipAuth: true });
}
