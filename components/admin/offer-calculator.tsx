import { Calculator } from "lucide-react";

import { type Appliance, calculateSystem } from "@/lib/solar-calculator";
import { formatPrice } from "@/lib/utils";

interface Props {
  appliances: Appliance[];
}

export function OfferCalculator({ appliances }: Props) {
  const result = calculateSystem(appliances);
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Calculator className="h-4 w-4 text-lime-dark dark:text-lime-primary" strokeWidth={2.2} />
        <h2 className="text-sm font-semibold tracking-tight">
          Hızlı Sistem Hesabı
        </h2>
      </header>
      {result.totalPowerW === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          Müşteri henüz cihaz gücü belirtmemiş. Manuel hesaplama yapın.
        </p>
      ) : (
        <dl className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-3">
          {[
            { label: "Toplam Güç", value: `${result.totalPowerW.toLocaleString("tr-TR")} W` },
            {
              label: "Günlük Tüketim (≈8 saat)",
              value: `${result.dailyEnergyKwh.toFixed(1)} kWh`,
            },
            {
              label: "Aylık Tüketim",
              value: `${result.monthlyEnergyKwh.toFixed(0)} kWh`,
            },
            {
              label: "Önerilen Panel (550W)",
              value: `${result.panelCount} adet`,
            },
            {
              label: "Önerilen İnverter",
              value: `${result.recommendedInverterKw} kW`,
            },
            {
              label: "Önerilen Batarya (48V)",
              value: `${result.recommendedBatteryAh} Ah`,
            },
          ].map((row) => (
            <div key={row.label} className="px-5 py-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                {row.label}
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
          <div className="col-span-2 border-t border-border bg-lime-primary/10 px-5 py-3 md:col-span-3">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-foreground">
              Kabataslak Yatırım
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {formatPrice(result.roughCostTry)}
            </dd>
            <p className="mt-1 text-xs text-muted">
              Saha keşfi ve tedarikçi fiyat hareketlerine göre ±%10 değişebilir.
            </p>
          </div>
        </dl>
      )}
    </section>
  );
}
