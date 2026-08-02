"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { IconLogout, IconMenu } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/context";
import { labelize } from "@/lib/utils";

export function Topbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenu} className="rounded-field p-2 text-ink-soft hover:bg-bg-alt lg:hidden" aria-label="Open menu">
          <IconMenu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-extrabold text-ink">{title}</h1>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-field px-2 py-1.5 hover:bg-bg-alt"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-bold leading-tight text-ink">{user?.name}</span>
            <span className="block text-xs leading-tight text-ink-faint">{labelize(user?.role)}</span>
          </span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-card border border-border bg-white p-2 shadow-lg">
              <div className="px-2 py-1.5">
                <p className="text-sm font-bold text-ink">{user?.name}</p>
                <p className="text-xs text-ink-faint">{user?.email}</p>
                <Badge tone="primary" className="mt-2">
                  {labelize(user?.role)}
                </Badge>
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-field px-2 py-2 text-left text-sm font-semibold text-orange hover:bg-orange-soft"
              >
                <IconLogout className="h-4 w-4" /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
