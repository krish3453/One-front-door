import { prisma } from "../../../lib/prisma.js";

export async function searchCampusServices(query: string) {
  const services = await prisma.campusService.findMany({
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
    include: {
      location: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return services;
}