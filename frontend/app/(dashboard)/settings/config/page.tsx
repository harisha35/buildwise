"use client";

import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageSpinner } from "@/components/ui/spinner";
import { useCreateProjectType, useProjectTypes } from "@/lib/hooks/use-projects";
import { useCreateWorkerType, useWorkerTypes } from "@/lib/hooks/use-workers";
import { errorMessage, formatCurrency } from "@/lib/utils";

export default function ConfigSettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Configuration</h2>
        <p className="mt-1 text-sm text-ink-soft">Admin-configurable lists used across projects and workers.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProjectTypesCard />
        <WorkerTypesCard />
      </div>
    </div>
  );
}

function ProjectTypesCard() {
  const { data: types, isLoading } = useProjectTypes();
  const createType = useCreateProjectType();
  const toast = useToast();
  const [name, setName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createType.mutateAsync(name.trim());
      toast.success(`Added project type "${name.trim()}".`);
      setName("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Types</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <form className="flex gap-2" onSubmit={handleAdd}>
          <Input placeholder="e.g. Residential" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" size="sm" loading={createType.isPending}>
            Add
          </Button>
        </form>
        {isLoading && <PageSpinner />}
        {types && types.length === 0 && <EmptyState title="No project types yet" />}
        {types && types.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {types.map((t) => (
              <li key={t.id} className="rounded-field bg-bg-alt px-3 py-2 text-sm font-semibold text-ink">
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function WorkerTypesCard() {
  const { data: types, isLoading } = useWorkerTypes();
  const createType = useCreateWorkerType();
  const toast = useToast();
  const [name, setName] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [otRate, setOtRate] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createType.mutateAsync({
        name: name.trim(),
        default_daily_rate: dailyRate ? Number(dailyRate) : null,
        default_ot_rate: otRate ? Number(otRate) : null,
      });
      toast.success(`Added worker type "${name.trim()}".`);
      setName("");
      setDailyRate("");
      setOtRate("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Types</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-4" onSubmit={handleAdd}>
          <Input className="sm:col-span-2" placeholder="e.g. Mason" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Daily rate" type="number" min={0} value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
          <Input placeholder="OT rate" type="number" min={0} value={otRate} onChange={(e) => setOtRate(e.target.value)} />
          <Button type="submit" size="sm" className="sm:col-span-4" loading={createType.isPending}>
            Add Worker Type
          </Button>
        </form>
        {isLoading && <PageSpinner />}
        {types && types.length === 0 && <EmptyState title="No worker types yet" />}
        {types && types.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {types.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-field bg-bg-alt px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="tabular text-ink-faint">
                  {t.default_daily_rate ? formatCurrency(t.default_daily_rate) : "—"} / {t.default_ot_rate ? formatCurrency(t.default_ot_rate) : "—"} OT
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
