"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FieldWrap, Input } from "@/components/ui/field";
import { resetPassword } from "@/lib/api/auth";
import { errorMessage } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(errorMessage(err, "That reset link is invalid or has expired."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-xl font-extrabold text-ink">Set a new password</h2>
        <p className="mt-1 text-sm text-ink-soft">Choose a new password for your account.</p>

        {!token && (
          <p className="mt-6 rounded-field border border-orange/30 bg-orange-soft px-3 py-3 text-sm font-semibold text-orange">
            This reset link is missing its token. Request a new one from the forgot password page.
          </p>
        )}

        {done ? (
          <p className="mt-6 rounded-field border border-good/30 bg-good-soft px-3 py-3 text-sm font-semibold text-good">
            Password updated. Redirecting you to login&hellip;
          </p>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <FieldWrap label="New password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FieldWrap>
            <FieldWrap label="Confirm password" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FieldWrap>
            {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}
            <Button type="submit" loading={submitting} disabled={!token} className="w-full">
              Update password
            </Button>
          </form>
        )}

        <div className="mt-5 text-center text-sm">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
