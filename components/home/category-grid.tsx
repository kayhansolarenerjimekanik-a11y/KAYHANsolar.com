import { ArrowRight, Battery, CircuitBoard, Lightbulb, Package, Sun } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

const categoryIcons: Record<string, React.ElementType> = {
  "cat-panel": Sun,
  "cat-battery": Battery,
  "cat-inverter": CircuitBoard,
  "cat-light": Lightbulb,
  "cat-package": Package,
};

export async function CategoryGrid() {
  const categories = await repo.listCategories({ onlyActive: true });

  return (
    <section className="border-t border-border">
      <Container className="py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Kategoriler
            </h2>
            <p className="mt-2 text-muted">
              İhtiyacınıza göre özenle seçilmiş ürün gruplarımız.
            </p>
          </div>
          <Link
            href="/magaza"
            className="hidden items-center gap-1 text-sm font-medium text-foreground hover:text-lime-dark sm:inline-flex dark:hover:text-lime-primary"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => {
            const Icon = categoryIcons[category.id] ?? Sun;
            return (
              <Link
                key={category.id}
                href={`/magaza?kategori=${category.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-lime-primary hover:shadow-lg hover:shadow-lime-primary/10"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark transition-colors group-hover:bg-lime-primary group-hover:text-black dark:text-lime-primary">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">
                  {category.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {category.description}
                </p>
                <ArrowRight
                  className="mt-3 h-4 w-4 text-muted transition-colors group-hover:text-foreground"
                  strokeWidth={2.2}
                />
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
