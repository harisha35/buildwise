"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select, Textarea } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import { useToast } from "@/components/providers/toast-provider";
import { useAuth } from "@/lib/auth/context";
import { useCreateProject, useProjectTypes, useProjects } from "@/lib/hooks/use-projects";
import type { ContractType, ProjectCreate, ProjectStatus } from "@/lib/api/types";
import { errorMessage, formatCurrency, formatDate, labelize } from "@/lib/utils";

const STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  planning: "purple",
  ongoing: "good",
  on_hold: "orange",
  completed: "neutral",
};

const EMPTY_FORM: ProjectCreate = {
  name: "",
  client_name: "",
  client_contact: "",
  location: "",
  start_date: "",
  end_date: "",
  project_type_id: null,
  contract_type: null,
  budget: null,
};

export default function ProjectsPage() {
  const { can } = useAuth();
  const { data: projects, isLoading } = useProjects();
  const { data: projectTypes } = useProjectTypes();
  const createProject = useCreateProject();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectCreate>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createProject.mutateAsync({
        ...form,
        client_name: form.client_name || null,
        client_contact: form.client_contact || null,
        location: form.location || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      toast.success(`${form.name} was created.`);
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Projects</h2>
          <p className="mt-1 text-sm text-ink-soft">Every active and past site under this account.</p>
        </div>
        {can("projects:write") && (
          <Button onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" /> New Project
          </Button>
        )}
      </div>

      {isLoading && <PageSpinner />}

      {projects && projects.length === 0 && (
        <Card>
          <EmptyState
            title="No projects yet"
            description="Create your first project to start tracking workers, attendance and billing."
            action={
              can("projects:write") ? (
                <Button onClick={() => setOpen(true)}>
                  <IconPlus className="h-4 w-4" /> New Project
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {projects && projects.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Timeline</th>
                <th className="px-5 py-3">Budget</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-border last:border-0 hover:bg-bg-alt">
                  <td className="px-5 py-3.5">
                    <Link href={`/projects/${project.id}`} className="font-bold text-ink hover:text-primary">
                      {project.name}
                    </Link>
                    <div className="text-xs text-ink-faint">{project.location || "No location set"}</div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{project.client_name || "—"}</td>
                  <td className="px-5 py-3.5 text-ink-soft">
                    {formatDate(project.start_date)} – {formatDate(project.end_date)}
                  </td>
                  <td className="tabular px-5 py-3.5 text-ink-soft">{project.budget ? formatCurrency(project.budget) : "—"}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={STATUS_TONE[project.status]}>{labelize(project.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Project" width="lg">
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <FieldWrap label="Project name" htmlFor="p-name" required>
            <Input id="p-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldWrap>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap label="Client name" htmlFor="p-client">
              <Input id="p-client" value={form.client_name ?? ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </FieldWrap>
            <FieldWrap label="Client contact" htmlFor="p-contact">
              <Input id="p-contact" value={form.client_contact ?? ""} onChange={(e) => setForm({ ...form, client_contact: e.target.value })} />
            </FieldWrap>
          </div>
          <FieldWrap label="Site location" htmlFor="p-location">
            <Textarea id="p-location" value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </FieldWrap>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap label="Start date" htmlFor="p-start">
              <Input id="p-start" type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </FieldWrap>
            <FieldWrap label="Expected end date" htmlFor="p-end">
              <Input id="p-end" type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </FieldWrap>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap label="Project type" htmlFor="p-type">
              <Select
                id="p-type"
                value={form.project_type_id ?? ""}
                onChange={(e) => setForm({ ...form, project_type_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Unspecified</option>
                {projectTypes?.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </Select>
            </FieldWrap>
            <FieldWrap label="Contract type" htmlFor="p-contract">
              <Select
                id="p-contract"
                value={form.contract_type ?? ""}
                onChange={(e) => setForm({ ...form, contract_type: (e.target.value || null) as ContractType | null })}
              >
                <option value="">Unspecified</option>
                <option value="fixed_price">Fixed Price</option>
                <option value="cost_plus">Cost Plus</option>
                <option value="other">Other</option>
              </Select>
            </FieldWrap>
          </div>
          <FieldWrap label="Budget (₹)" htmlFor="p-budget" hint="Optional">
            <Input
              id="p-budget"
              type="number"
              min={0}
              value={form.budget ?? ""}
              onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : null })}
            />
          </FieldWrap>

          {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createProject.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
