import { getLocationDetails } from "./get-location-details.js";
import { prisma } from "../../../lib/prisma.js";

async function main() {
  const result = await getLocationDetails("central-library");

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