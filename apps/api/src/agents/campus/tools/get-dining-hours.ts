import { prisma } from "../../../lib/prisma.js";

export async function getDiningHours(diningId: string) {
  const dining = await prisma.diningOutlet.findUnique({
    where: {
      id: diningId,
    },
    include: {
      hours: {
        orderBy: {
          dayOfWeek: "asc",
        },
      },
    },
  });

  if (!dining) {
    return null;
  }

  return {
    id: dining.id,
    name: dining.name,
    type: dining.type,
    hours: dining.hours,
  };
}