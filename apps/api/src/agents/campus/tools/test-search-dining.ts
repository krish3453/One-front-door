import { searchDining } from "./search-dining.js";
import { prisma } from "../../../lib/prisma.js";

async function main() {
  const results = await searchDining("restaurant");

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });