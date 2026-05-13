import { notFound } from "next/navigation";

import { LabelForm } from "@/components/admin/label-form";
import { repo } from "@/lib/data";

import { updateLabelAction } from "@/app/(admin)/kayhan-yonetim/actions/labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLabelPage({ params }: Props) {
  const { id } = await params;
  const label = await repo.getProductLabelById(id);
  if (!label) notFound();

  const boundAction = updateLabelAction.bind(null, id);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Etiketi Düzenle</h1>
      <LabelForm initial={label} action={boundAction} submitLabel="Kaydet" />
    </div>
  );
}
