export const PRODUCT_CATEGORIES = [
  "Électronique",
  "Chaussures",
  "Modes",
  "Véhicules",
  "Maison",
  "Autres",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_SUBCATEGORIES: Record<ProductCategory, readonly string[]> = {
  Électronique: [
    "Smartphones",
    "Ordinateurs",
    "Audio & Casques",
    "Montres connectées",
    "Caméras",
    "Câbles & Chargeurs",
  ],
  Chaussures: [
    "Baskets",
    "Chaussures ville",
    "Sandales",
    "Chaussures sport",
    "Chaussures enfant",
    "Accessoires chaussures",
  ],
  Modes: [
    "Sacs & Sacoches",
    "Vêtements femme",
    "Vêtements homme",
    "Montres & Bijoux",
    "Beauté",
    "Accessoires mode",
  ],
  Véhicules: [
    "Pièces auto",
    "Moto",
    "Accessoires voiture",
    "Éclairage auto",
    "Outils garage",
    "Sécurité",
  ],
  Maison: [
    "Électroménager",
    "Cuisine",
    "Décoration",
    "Rangement",
    "Luminaires",
    "Entretien maison",
  ],
  Autres: [
    "Bureautique",
    "Jeux & Loisirs",
    "Bébé",
    "Santé",
    "Bricolage",
    "Divers",
  ],
} as const;

export function isValidSubcategory(
  category: string,
  subcategory: string | null | undefined,
): boolean {
  if (!subcategory) return true;
  const options = PRODUCT_SUBCATEGORIES[category as ProductCategory];
  if (!options) return false;
  return options.includes(subcategory);
}
