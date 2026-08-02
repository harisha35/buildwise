"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FieldWrap, Input } from "@/components/ui/field";
import { forgotPassword } from "@/lib/api/auth";
import { errorMessage } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-xl font-extrabold text-ink">Reset your password</h2>
        <p className="mt-1 text-sm text-ink-soft">We&rsquo;ll send a reset link to your registered email.</p>

        {sent ? (
          <p className="mt-6 rounded-field border border-good/30 bg-good-soft px-3 py-3 text-sm font-semibold text-good">
            If that email is registered, a reset link is on its way.
          </p>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <FieldWrap label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@buildwise.com"
              />
            </FieldWrap>
            {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}
            <Button type="submit" loading={submitting} className="w-full">
              Send reset link
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
