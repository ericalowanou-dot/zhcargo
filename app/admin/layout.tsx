"use client";

import { AdminLayoutShell } from "@/components/admin/AdminLayoutShell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login" || pathname?.startsWith("/admin/login/")) {
    return (
      <div className="min-h-screen bg-surface-page">{children}</div>
    );
  }
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
