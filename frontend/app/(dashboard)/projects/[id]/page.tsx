"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldWrap, Input, Select, Textarea } from "@/components/ui/field";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/context";
import type { ContractType, ProjectStatus, ProjectUpdate } from "@/lib/api/types";
import { useAssignSupervisor, useArchiveProject, useProject, useProjectTypes, useUpdateProject } from "@/lib/hooks/use-projects";
import { useUsers } from "@/lib/hooks/use-users";
import { errorMessage, formatCurrency, formatDate, labelize } from "@/lib/utils";

const STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  planning: "purple",
  ongoing: "good",
  on_hold: "orange",
  completed: "neutral",
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const { can } = useAuth();
  const toast = useToast();

  const { data: project, isLoading } = useProject(projectId);
  const { data: projectTypes } = useProjectTypes();
  const updateProject = useUpdateProject(projectId);
  const archiveProject = useArchiveProject();

  const [form, setForm] = useState<ProjectUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) setForm(project);
  }, [project]);

  if (isLoading || !form) return <PageSpinner />;
  if (!project) return <p className="text-ink-soft">Project not found.</p>;

  const canWrite = can("projects:write");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    try {
      await updateProject.mutateAsync(form);
      toast.success("Project details saved.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive "${project?.name}"? It will be hidden from active lists but kept for reports.`)) return;
    try {
      await archiveProject.mutateAsync(projectId);
      toast.success("Project archived.");
      router.push("/projects");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/projects" className="text-xs font-bold uppercase tracking-wide text-ink-faint hover:text-primary">
            ← All Projects
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-ink">{project.name}</h2>
            <Badge tone={STATUS_TONE[project.status]}>{labelize(project.status)}</Badge>
          </div>
        </div>
        {canWrite && !project.is_deleted && (
          <Button variant="danger" size="sm" onClick={handleArchive} loading={archiveProject.isPending}>
            Archive Project
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={handleSave}>
              <FieldWrap label="Project name" htmlFor="name" required>
                <Input id="name" required disabled={!canWrite} value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrap label="Client name" htmlFor="client">
                  <Input id="client" disabled={!canWrite} value={form.client_name ?? ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="Client contact" htmlFor="contact">
                  <Input id="contact" disabled={!canWrite} value={form.client_contact ?? ""} onChange={(e) => setForm({ ...form, client_contact: e.target.value })} />
                </FieldWrap>
              </div>
              <FieldWrap label="Site location" htmlFor="location">
                <Textarea id="location" disabled={!canWrite} value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrap label="Start date" htmlFor="start">
                  <Input id="start" type="date" disabled={!canWrite} value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="Expected end date" htmlFor="end">
                  <Input id="end" type="date" disabled={!canWrite} value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </FieldWrap>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FieldWrap label="Project type" htmlFor="type">
                  <Select
                    id="type"
                    disabled={!canWrite}
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
                <FieldWrap label="Contract type" htmlFor="contract">
                  <Select
                    id="contract"
                    disabled={!canWrite}
                    value={form.contract_type ?? ""}
                    onChange={(e) => setForm({ ...form, contract_type: (e.target.value || null) as ContractType | null })}
                  >
                    <option value="">Unspecified</option>
                    <option value="fixed_price">Fixed Price</option>
                    <option value="cost_plus">Cost Plus</option>
                    <option value="other">Other</option>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Status" htmlFor="status">
                  <Select
                    id="status"
                    disabled={!canWrite}
                    value={form.status ?? project.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  >
                    <option value="planning">Planning</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </Select>
                </FieldWrap>
              </div>
              <FieldWrap label="Budget (₹)" htmlFor="budget">
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  disabled={!canWrite}
                  value={form.budget ?? ""}
                  onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : null })}
                />
              </FieldWrap>

              {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

              {canWrite && (
                <div className="flex justify-end">
                  <Button type="submit" loading={updateProject.isPending}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardBody className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Budget</span>
                <span className="tabular font-bold text-ink">{project.budget ? formatCurrency(project.budget) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Timeline</span>
                <span className="font-semibold text-ink">
                  {formatDate(project.start_date)} – {formatDate(project.end_date)}
                </span>
              </div>
            </CardBody>
          </Card>

          {canWrite && <AssignSupervisorCard projectId={projectId} />}
        </div>
      </div>
    </div>
  );
}

function AssignSupervisorCard({ projectId }: { projectId: number }) {
  const { data: users } = useUsers();
  const assignSupervisor = useAssignSupervisor(projectId);
  const toast = useToast();
  const [selected, setSelected] = useState("");

  const supervisors = users?.filter((u) => u.role === "supervisor" && u.is_active) ?? [];

  async function handleAssign() {
    if (!selected) return;
    try {
      await assignSupervisor.mutateAsync(Number(selected));
      toast.success("Supervisor assigned to this project.");
      setSelected("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Supervisor</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {supervisors.length === 0 ? (
          <p className="text-sm text-ink-soft">No supervisor accounts yet. Add one under Settings → Users.</p>
        ) : (
          <>
            <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Choose a supervisor…</option>
              {supervisors.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={handleAssign} disabled={!selected} loading={assignSupervisor.isPending}>
              Assign
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
