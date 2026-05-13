import { LabelForm } from "@/components/admin/label-form";

import { createLabelAction } from "@/app/(admin)/kayhan-yonetim/actions/labels";

export default function NewLabelPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Yeni Etiket</h1>
      <LabelForm action={createLabelAction} submitLabel="Oluştur" />
    </div>
  );
}
