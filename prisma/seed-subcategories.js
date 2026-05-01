const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MARKER = "SEED_SUBCATS_V1";

const products = [
  {
    name: "iPhone 13 128Go Reconditionne Premium",
    category: "Électronique",
    subcategory: "Smartphones",
    description: `Smartphone haut de gamme, batterie testee, excellent etat. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=1200&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 165000,
    transportCost: 9000,
    margin: 16000,
    salePrice: 190000,
    moq: 1,
    deliveryDays: "5 a 8 jours ouvres",
    stock: 12,
    isActive: true,
  },
  {
    name: "Ultrabook 14 pouces i5 16Go RAM",
    category: "Électronique",
    subcategory: "Ordinateurs",
    description: `PC portable rapide pour bureautique et creation de contenu. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 210000,
    transportCost: 12000,
    margin: 28000,
    salePrice: 250000,
    moq: 1,
    deliveryDays: "8 a 12 jours ouvres",
    stock: 8,
    isActive: true,
  },
  {
    name: "Casque Bluetooth ANC X-Pro",
    category: "Électronique",
    subcategory: "Audio & Casques",
    description: `Reduction de bruit active, autonomie 30h, son detaille. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 14500,
    transportCost: 2200,
    margin: 4300,
    salePrice: 21000,
    moq: 2,
    deliveryDays: "6 a 9 jours ouvres",
    stock: 40,
    isActive: true,
  },
  {
    name: "Basket Running AirFlex Homme",
    category: "Chaussures",
    subcategory: "Baskets",
    description: `Semelle amortissante, maintien lateral, ideal quotidien. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=900&fit=crop&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 12500,
    transportCost: 2500,
    margin: 5000,
    salePrice: 20000,
    moq: 1,
    deliveryDays: "10 a 15 jours ouvres",
    stock: 30,
    isActive: true,
  },
  {
    name: "Sacoche Business Cuir Vegan",
    category: "Modes",
    subcategory: "Sacs & Sacoches",
    description: `Sacoche elegante multi-compartiments pour bureau. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 8200,
    transportCost: 1800,
    margin: 4000,
    salePrice: 14000,
    moq: 2,
    deliveryDays: "8 a 12 jours ouvres",
    stock: 22,
    isActive: true,
  },
  {
    name: "Robe Fleurie Midi Femme",
    category: "Modes",
    subcategory: "Vêtements femme",
    description: `Robe legere, tissu respirant, coupe moderne. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 7200,
    transportCost: 1300,
    margin: 3500,
    salePrice: 12000,
    moq: 2,
    deliveryDays: "9 a 14 jours ouvres",
    stock: 26,
    isActive: true,
  },
  {
    name: "Dashcam 1080p Vision Nocturne",
    category: "Véhicules",
    subcategory: "Accessoires voiture",
    description: `Camera embarquee avec detection de mouvement. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1511910849309-0f2d1a6f93d4?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 13000,
    transportCost: 3000,
    margin: 6000,
    salePrice: 22000,
    moq: 1,
    deliveryDays: "12 a 18 jours ouvres",
    stock: 18,
    isActive: true,
  },
  {
    name: "Mixeur Blender 2L Inox",
    category: "Maison",
    subcategory: "Électroménager",
    description: `Mixeur puissant pour jus, sauces et smoothies. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 15800,
    transportCost: 3200,
    margin: 7000,
    salePrice: 26000,
    moq: 1,
    deliveryDays: "10 a 16 jours ouvres",
    stock: 16,
    isActive: true,
  },
  {
    name: "Tournevis Electrique Precision 62-en-1",
    category: "Autres",
    subcategory: "Bricolage",
    description: `Kit complet pour telephones, laptops et petits appareils. (${MARKER})`,
    photos: JSON.stringify([
      "https://images.unsplash.com/photo-1581147036324-c1c7f0f4f5c8?w=1200&h=900&fit=crop&q=80",
    ]),
    purchasePrice: 9900,
    transportCost: 2100,
    margin: 5000,
    salePrice: 17000,
    moq: 1,
    deliveryDays: "8 a 12 jours ouvres",
    stock: 28,
    isActive: true,
  },
];

async function main() {
  const deleted = await prisma.product.deleteMany({
    where: { description: { contains: MARKER } },
  });
  console.log(`Produits demo supprimes: ${deleted.count}`);

  await prisma.product.createMany({ data: products });
  console.log(`Produits demo ajoutes: ${products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
