"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import type { LineItemInput } from "@/lib/api/types";
import { formatCurrency } from "@/lib/utils";

const EMPTY_ROW: LineItemInput = { description: "", quantity: 1, rate: 0 };

export function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
}) {
  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);

  function updateRow(index: number, patch: Partial<LineItemInput>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="field-label">Line items</label>
      <div className="flex flex-col gap-2">
        {items.map((row, i) => (
          <div key={i} className="flex flex-wrap items-start gap-2 rounded-field bg-bg-alt p-2.5 sm:flex-nowrap">
            <Input
              placeholder="Description"
              required
              className="min-w-[160px] flex-1"
              value={row.description}
              onChange={(e) => updateRow(i, { description: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Qty"
              required
              className="w-20"
              value={row.quantity || ""}
              onChange={(e) => updateRow(i, { quantity: Number(e.target.value) || 0 })}
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Rate"
              required
              className="w-24"
              value={row.rate || ""}
              onChange={(e) => updateRow(i, { rate: Number(e.target.value) || 0 })}
            />
            <div className="tabular flex h-10 min-w-[92px] flex-none items-center justify-end px-1 text-sm font-semibold text-ink">
              {formatCurrency((row.quantity || 0) * (row.rate || 0))}
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={items.length <= 1}
              className="flex h-10 w-8 flex-none items-center justify-center text-ink-faint hover:text-orange disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Remove line item"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...EMPTY_ROW }])}>
          <IconPlus className="h-4 w-4" /> Add Line
        </Button>
        <div className="text-sm font-bold text-ink">
          Total: <span className="tabular">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export { EMPTY_ROW as emptyLineItem };
