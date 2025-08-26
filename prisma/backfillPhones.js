const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple helper to generate a pseudo-random Nigerian number
function generatePhone(i) {
  // Always starts with +23480/81/90/etc.
  const prefixes = ['+234801', '+234802', '+234803', '+234804', '+234805', '+234806', '+234807', '+234808', '+234809'];
  const prefix = prefixes[i % prefixes.length];
  const rest = String(Math.floor(1000000 + Math.random() * 8999999)); // 7 digits
  return prefix + rest;
}

async function main() {
  // Students without phone
  const students = await prisma.student.findMany({ where: { phone: null } });
  for (let i = 0; i < students.length; i++) {
    const phone = generatePhone(i);
    await prisma.student.update({
      where: { id: students[i].id },
      data: { phone },
    });
    console.log(`Student ${students[i].id} updated with phone: ${phone}`);
  }

  // Drivers without phone
  const drivers = await prisma.driver.findMany({ where: { phone: null } });
  for (let i = 0; i < drivers.length; i++) {
    const phone = generatePhone(i + 100); // shift index so no clash
    await prisma.driver.update({
      where: { id: drivers[i].id },
      data: { phone },
    });
    console.log(`Driver ${drivers[i].id} updated with phone: ${phone}`);
  }
}

main()
  .then(() => {
    console.log('Backfill complete!');
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
