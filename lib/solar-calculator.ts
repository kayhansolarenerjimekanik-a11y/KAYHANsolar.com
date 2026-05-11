export interface Appliance {
  name: string;
  powerW?: number;
}

export interface CalcResult {
  totalPowerW: number;
  dailyEnergyKwh: number; // assuming 8 hours/day average usage
  monthlyEnergyKwh: number;
  panelCount: number; // 550W panels with 1.3x oversize factor
  recommendedInverterKw: number;
  recommendedBatteryAh: number;
  roughCostTry: number;
}

// Assumptions used for the rough quote
const PANEL_WATTAGE = 550;
const ASSUMED_DAILY_HOURS = 8;
const OVERSIZE_FACTOR = 1.3; // panel sizing
const PANEL_COST = 3450;
const INVERTER_COST_PER_KW = 1950;
const BATTERY_COST_PER_AH = 185;
const INSTALL_BASE_COST = 25000;

export function calculateSystem(appliances: Appliance[]): CalcResult {
  const totalPowerW = appliances.reduce((s, a) => s + (a.powerW ?? 0), 0);
  const dailyEnergyKwh = (totalPowerW * ASSUMED_DAILY_HOURS) / 1000;
  const monthlyEnergyKwh = dailyEnergyKwh * 30;

  const panelCount = totalPowerW > 0 ? Math.max(2, Math.ceil((totalPowerW * OVERSIZE_FACTOR) / PANEL_WATTAGE)) : 0;
  const recommendedInverterKw = totalPowerW > 0 ? Math.max(3, Math.ceil((totalPowerW * 1.25) / 1000)) : 0;
  const recommendedBatteryAh = dailyEnergyKwh > 0 ? Math.max(100, Math.ceil((dailyEnergyKwh * 1000) / 48)) : 0;

  const roughCostTry =
    panelCount * PANEL_COST +
    recommendedInverterKw * INVERTER_COST_PER_KW +
    recommendedBatteryAh * BATTERY_COST_PER_AH +
    (panelCount > 0 ? INSTALL_BASE_COST : 0);

  return {
    totalPowerW,
    dailyEnergyKwh,
    monthlyEnergyKwh,
    panelCount,
    recommendedInverterKw,
    recommendedBatteryAh,
    roughCostTry,
  };
}
