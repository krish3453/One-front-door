import { getDiningHours } from "./get-dining-hours.js";
import { prisma } from "../../../lib/prisma.js";

async function main() {
  const result = await getDiningHours("dominos");

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });