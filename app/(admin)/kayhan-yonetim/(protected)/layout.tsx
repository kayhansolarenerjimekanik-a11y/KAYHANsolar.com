import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "Yönetim", template: "%s | KAYHAN Yönetim" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const unreadCount = await repo.unreadCount();
  return (
    <AdminShell email={session.email} unreadCount={unreadCount}>
      {children}
    </AdminShell>
  );
}
