import { SettingsForm } from "@/components/admin/settings-form";
import { repo } from "@/lib/data";

export default async function AdminSettingsPage() {
  const settings = await repo.getSettings();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Site Ayarları</h1>
        <p className="mt-1 text-sm text-muted">
          Müşterilerin gördüğü iletişim ve sosyal medya bilgileri.
        </p>
      </header>
      <SettingsForm initial={settings} />
    </div>
  );
}
