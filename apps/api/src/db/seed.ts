import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const SOURCE = "https://www.bennett.edu.in/";

async function main() {
  console.log("Seeding campus database...");

  // --------------------------------------------------
  // LOCATIONS
  // --------------------------------------------------

  const sportsComplex = await prisma.campusLocation.upsert({
    where: { id: "sports-complex" },
    update: {
      name: "Sports Complex",
      category: "sports",
      description:
        "Campus sports complex with indoor and outdoor sports facilities.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/infrastructure/",
      verifiedAt: new Date(),
    },
    create: {
      id: "sports-complex",
      name: "Sports Complex",
      category: "sports",
      description:
        "Campus sports complex with indoor and outdoor sports facilities.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/infrastructure/",
      verifiedAt: new Date(),
    },
  });

  const centralLibrary = await prisma.campusLocation.upsert({
    where: { id: "central-library" },
    update: {
      name: "Central Library",
      category: "academic",
      description:
        "Central library providing learning and research resources.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/infrastructure/",
      verifiedAt: new Date(),
    },
    create: {
      id: "central-library",
      name: "Central Library",
      category: "academic",
      description:
        "Central library providing learning and research resources.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/infrastructure/",
      verifiedAt: new Date(),
    },
  });

  const wellnessCentre = await prisma.campusLocation.upsert({
    where: { id: "wellness-centre" },
    update: {
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "On-campus integrated medical facility providing round-the-clock medical facilities.",
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
    create: {
      id: "wellness-centre",
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "On-campus integrated medical facility providing round-the-clock medical facilities.",
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
  });

  const cafeteria = await prisma.campusLocation.upsert({
    where: { id: "main-cafeteria" },
    update: {
      name: "Main Cafeteria",
      category: "dining",
      description:
        "Two-storeyed campus cafeteria serving breakfast, lunch, evening snacks and dinner.",
      sourceUrl:
        "https://www.bennett.edu.in/Infrastructure/cafeteria-where-food-is-served-with-love/",
      verifiedAt: new Date(),
    },
    create: {
      id: "main-cafeteria",
      name: "Main Cafeteria",
      category: "dining",
      description:
        "Two-storeyed campus cafeteria serving breakfast, lunch, evening snacks and dinner.",
      sourceUrl:
        "https://www.bennett.edu.in/Infrastructure/cafeteria-where-food-is-served-with-love/",
      verifiedAt: new Date(),
    },
  });

  // --------------------------------------------------
  // SERVICES
  // --------------------------------------------------

  await prisma.campusService.upsert({
    where: { id: "wellness-centre-service" },
    update: {
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "20-bed integrated medical facility with round-the-clock medical facilities and ambulance service.",
      locationId: wellnessCentre.id,
      phone: "0120-7199500",
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
    create: {
      id: "wellness-centre-service",
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "20-bed integrated medical facility with round-the-clock medical facilities and ambulance service.",
      locationId: wellnessCentre.id,
      phone: "0120-7199500",
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "counselling-centre" },
    update: {
      name: "Counselling Centre",
      category: "counselling",
      description:
        "Student counselling support provided through the university counselling centre.",
      phone: "0120-7199500 / 9289109580",
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
    create: {
      id: "counselling-centre",
      name: "Counselling Centre",
      category: "counselling",
      description:
        "Student counselling support provided through the university counselling centre.",
      phone: "0120-7199500 / 9289109580",
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "campus-transportation" },
    update: {
      name: "Campus Transportation",
      category: "transportation",
      description:
        "Transportation services are provided for day scholars, resident students, faculty and staff.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/student-services/",
      verifiedAt: new Date(),
    },
    create: {
      id: "campus-transportation",
      name: "Campus Transportation",
      category: "transportation",
      description:
        "Transportation services are provided for day scholars, resident students, faculty and staff.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/student-services/",
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "bu-basiks" },
    update: {
      name: "BU Basiks",
      category: "convenience-store",
      description:
        "Campus convenience store providing everyday essentials.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/hostels-at-bu/",
      verifiedAt: new Date(),
    },
    create: {
      id: "bu-basiks",
      name: "BU Basiks",
      category: "convenience-store",
      description:
        "Campus convenience store providing everyday essentials.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-life/hostels-at-bu/",
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "atm" },
    update: {
      name: "ATM",
      category: "banking",
      description: "24/7 ATM facility available on campus.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-university-galleries/",
      verifiedAt: new Date(),
    },
    create: {
      id: "atm",
      name: "ATM",
      category: "banking",
      description: "24/7 ATM facility available on campus.",
      sourceUrl:
        "https://www.bennett.edu.in/bennett-university-galleries/",
      verifiedAt: new Date(),
    },
  });

  // --------------------------------------------------
  // DINING
  // --------------------------------------------------

  const dining = [
    {
      id: "main-cafeteria",
      name: "Main Cafeteria",
      type: "cafeteria",
      description:
        "Main campus cafeteria serving breakfast, lunch, evening snacks and dinner.",
      locationId: cafeteria.id,
    },
    {
      id: "dominos",
      name: "Domino's",
      type: "restaurant",
      description: "Campus dining outlet.",
      locationId: cafeteria.id,
    },
    {
      id: "southern-stories",
      name: "Southern Stories",
      type: "restaurant",
      description: "Campus dining outlet.",
      locationId: cafeteria.id,
    },
    {
      id: "maggi-point",
      name: "Maggi Point",
      type: "food-joint",
      description: "Campus food and hangout joint.",
      locationId: cafeteria.id,
    },
    {
      id: "snap-eats",
      name: "Snap Eats",
      type: "food-joint",
      description: "Campus dining outlet.",
      locationId: cafeteria.id,
    },
  ];

  for (const outlet of dining) {
    await prisma.diningOutlet.upsert({
      where: { id: outlet.id },
      update: {
        name: outlet.name,
        type: outlet.type,
        description: outlet.description,
        locationId: outlet.locationId,
        sourceUrl: SOURCE,
        verifiedAt: new Date(),
      },
      create: {
        id: outlet.id,
        name: outlet.name,
        type: outlet.type,
        description: outlet.description,
        locationId: outlet.locationId,
        sourceUrl: SOURCE,
        verifiedAt: new Date(),
      },
    });
  }

  // --------------------------------------------------
  // EMERGENCY CONTACTS
  // --------------------------------------------------

  await prisma.emergencyContact.upsert({
    where: { id: "campus-wellness" },
    update: {
      name: "Wellness Centre",
      category: "medical",
      phone: "0120-7199500",
      description:
        "On-campus medical facility with round-the-clock medical facilities and ambulance service.",
      available24x7: true,
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
    create: {
      id: "campus-wellness",
      name: "Wellness Centre",
      category: "medical",
      phone: "0120-7199500",
      description:
        "On-campus medical facility with round-the-clock medical facilities and ambulance service.",
      available24x7: true,
      sourceUrl:
        "https://www.bennett.edu.in/student-services/wellness-centre/",
      verifiedAt: new Date(),
    },
  });

  console.log("Campus database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });