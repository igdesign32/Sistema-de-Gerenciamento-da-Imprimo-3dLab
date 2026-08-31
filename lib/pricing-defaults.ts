export type PricingDefaults = {
  energyRate: number;
  machineRate: number;
  packaging: number;
  margin: number;
  fees: number;
  risk: number;
};

export const defaultPricingDefaults: PricingDefaults = {
  energyRate: 0.86,
  machineRate: 3.4,
  packaging: 8,
  margin: 35,
  fees: 8,
  risk: 5,
};
