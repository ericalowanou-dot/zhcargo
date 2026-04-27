const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

(async () => {
  const prisma = new PrismaClient();

  const email = "admin@zhcargo.com";
  const password = "Admin1234!";
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { name: "Admin Test", password: hash, role: "admin" },
    create: { email, name: "Admin Test", password: hash, role: "admin" },
  });

  console.log("Admin prêt:", admin.email);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});