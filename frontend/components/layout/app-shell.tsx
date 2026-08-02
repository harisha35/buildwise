"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/context";

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/projects", title: "Projects" },
  { prefix: "/workers", title: "Workers" },
  { prefix: "/attendance", title: "Attendance" },
  { prefix: "/payments", title: "Payments & Ledger" },
  { prefix: "/settings/users", title: "User Management" },
  { prefix: "/settings/config", title: "Configuration" },
];

function titleFor(pathname: string) {
  return TITLES.find((t) => pathname.startsWith(t.prefix))?.title ?? "Buildwise";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-alt">
        <PageSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-alt">
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0">
          <Sidebar />
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-dark/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <Topbar title={titleFor(pathname)} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
