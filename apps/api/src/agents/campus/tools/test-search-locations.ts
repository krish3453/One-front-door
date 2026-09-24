import { searchLocations } from "./search-locations.js";
import { prisma } from "../../../lib/prisma.js";

async function main() {
  const results = await searchLocations("library");

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
  