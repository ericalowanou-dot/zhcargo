const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();

  const phone = "+22891000000";
  const name = "Client Test";
  const country = "TG";

  const client = await prisma.client.upsert({
    where: { phone },
    update: {
      name,
      country,
      city: "Lomé",
      neighborhood: "Adidogomé",
      landmark: "Repère test",
    },
    create: {
      phone,
      name,
      country,
      city: "Lomé",
      neighborhood: "Adidogomé",
      landmark: "Repère test",
    },
  });

  await prisma.clientSettings.upsert({
    where: { clientId: client.id },
    update: {
      smsNotifications: true,
      smsPromotions: true,
    },
    create: {
      clientId: client.id,
      smsNotifications: true,
      smsPromotions: true,
    },
  });

  console.log("Client test prêt:", client.phone, "-", client.name);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

