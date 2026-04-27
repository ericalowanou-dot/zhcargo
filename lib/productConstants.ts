export const PRODUCT_CATEGORIES = [
  "Électronique",
  "Chaussures",
  "Modes",
  "Véhicules",
  "Maison",
  "Autres",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
