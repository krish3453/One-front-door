import { prisma } from "../../../lib/prisma.js";

export async function getEmergencyContacts(category?: string) {
  const contacts = await prisma.emergencyContact.findMany({
    where: category
      ? {
          category: {
            contains: category,
            mode: "insensitive",
          },
        }
      : undefined,
    orderBy: {
      name: "asc",
    },
  });

  return contacts;
}