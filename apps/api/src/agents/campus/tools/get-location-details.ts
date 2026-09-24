import { prisma } from "../../../lib/prisma.js";

export async function getLocationDetails(locationId: string) {
  const location = await prisma.campusLocation.findUnique({
    where: {
      id: locationId,
    },
  });

  return location;
}