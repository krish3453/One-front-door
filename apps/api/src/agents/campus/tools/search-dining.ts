import { prisma } from "../../../lib/prisma.js";

export async function searchDining(query: string) {
  const outlets = await prisma.diningOutlet.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          type: {
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
    include: {
      location: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return outlets;
}