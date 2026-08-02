"use client";

import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import type { UserCreate, UserRole } from "@/lib/api/types";
import { useCreateUser, useDeactivateUser, useUsers } from "@/lib/hooks/use-users";
import { errorMessage, labelize } from "@/lib/utils";

const EMPTY_FORM: UserCreate = { name: "", email: "", password: "", role: "supervisor" };

export default function UsersSettingsPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const deactivateUser = useDeactivateUser();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UserCreate>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUser.mutateAsync(form);
      toast.success(`${form.name} was added as ${labelize(form.role)}.`);
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDeactivate(id: number, name: string) {
    if (!confirm(`Deactivate ${name}'s account?`)) return;
    try {
      await deactivateUser.mutateAsync(id);
      toast.success("User deactivated.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">User Management</h2>
          <p className="mt-1 text-sm text-ink-soft">Create Supervisor and Accountant accounts. No self-signup.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <IconPlus className="h-4 w-4" /> New User
        </Button>
      </div>

      {isLoading && <PageSpinner />}

      {users && users.length === 0 && <EmptyState title="No users yet" />}

      {users && users.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg-alt">
                  <td className="px-5 py-3.5 font-bold text-ink">{u.name}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone="primary">{labelize(u.role)}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={u.is_active ? "good" : "neutral"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(u.id, u.name)} loading={deactivateUser.isPending}>
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New User">
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <FieldWrap label="Name" htmlFor="u-name" required>
            <Input id="u-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Email" htmlFor="u-email" required>
            <Input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Temporary password" htmlFor="u-password" required>
            <Input
              id="u-password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </FieldWrap>
          <FieldWrap label="Role" htmlFor="u-role" required>
            <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="supervisor">Supervisor</option>
              <option value="accountant">Accountant</option>
              <option value="contractor">Contractor</option>
              <option value="owner">Owner</option>
            </Select>
          </FieldWrap>

          {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
