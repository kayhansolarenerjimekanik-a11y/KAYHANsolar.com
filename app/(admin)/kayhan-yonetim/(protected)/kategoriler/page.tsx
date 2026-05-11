import { CategoryManager } from "@/components/admin/category-manager";
import { repo } from "@/lib/data";

export default async function AdminCategoriesPage() {
  const categories = await repo.listCategories();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kategoriler</h1>
        <p className="mt-1 text-sm text-muted">
          {categories.length} kategori
        </p>
      </header>
      <CategoryManager categories={categories} />
    </div>
  );
}
