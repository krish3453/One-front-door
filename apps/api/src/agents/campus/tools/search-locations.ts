import { prisma } from "../../../lib/prisma.js";

export async function searchLocations(query: string) {
  const locations = await prisma.campusLocation.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: {
      name: "asc",
    },
  });

  return locations;
}