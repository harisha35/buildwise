"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldWrap, Input } from "@/components/ui/field";
import { useAuth } from "@/lib/auth/context";
import { errorMessage } from "@/lib/utils";

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Incorrect email or password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-xl font-extrabold text-ink">Log in to Buildwise</h2>
        <p className="mt-1 text-sm text-ink-soft">Attendance, wages and client billing — one console.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldWrap label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@buildwise.com"
            />
          </FieldWrap>
          <FieldWrap label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FieldWrap>

          {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

          <Button type="submit" loading={submitting} className="mt-1 w-full">
            Log in
          </Button>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot your password?
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
