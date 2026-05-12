import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { getSession } from "@/lib/auth";

export default async function AdminUsersPage() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcılar</h1>
        <p className="mt-1 text-sm text-muted">
          Demo modda yalnızca tek admin hesabı var. Çoklu kullanıcı yönetimi
          Supabase Auth entegrasyonu ile aktive olacak.
        </p>
      </header>

      <Table>
        <THead>
          <TR>
            <TH>E-posta</TH>
            <TH>Rol</TH>
            <TH className="hidden sm:table-cell">Oturum</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-lime-dark dark:text-lime-primary" strokeWidth={2.2} />
                <span className="font-medium">{session?.email ?? "—"}</span>
              </div>
            </TD>
            <TD>
              <Badge tone="lime">Admin</Badge>
            </TD>
            <TD className="hidden sm:table-cell text-xs text-muted">
              {session?.exp
                ? `Geçerlilik: ${new Date(session.exp * 1000).toLocaleString("tr-TR")}`
                : "—"}
            </TD>
          </TR>
        </TBody>
      </Table>

      <div className="rounded-2xl border border-dashed border-border bg-elevated p-5 text-sm text-muted">
        <p className="font-semibold text-foreground">Production deploy (Faz 6) sonrası gelecek:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Yeni moderatör/asistan kullanıcı davet et</li>
          <li>Rol değiştir (admin / moderator / assistant)</li>
          <li>2FA aktif/pasif</li>
          <li>Oturum sonlandır</li>
        </ul>
      </div>
    </div>
  );
}
